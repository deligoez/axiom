// Package web provides the HTTP server for AXIOM's web interface.
package web

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/deligoez/axiom/internal/agent"
	casestore "github.com/deligoez/axiom/internal/case"
	"github.com/deligoez/axiom/internal/scaffold"
)

//go:embed templates/*.html
var templatesFS embed.FS

// Server is the HTTP server for AXIOM.
type Server struct {
	mux       *http.ServeMux
	templates *template.Template
	caseStore *casestore.CaseStore
	caseFile  string

	// Init mode state
	initMode     bool
	promptPath   string
	configState  scaffold.ConfigState
	initMu       sync.Mutex
	initStarted  bool
	initLines    <-chan string
	initDone     <-chan error
	initErr      error
	initComplete bool
	conversation *agent.Conversation
	basePrompt   string

	// Output buffer for page refresh persistence
	initOutput []initEntry
}

// initEntry represents a buffered output entry.
type initEntry struct {
	Type    string // "assistant" or "user"
	Content string
}

// NewServer creates a new AXIOM web server.
func NewServer(caseFile string) *Server {
	tmpl, err := template.ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		log.Fatalf("failed to parse templates: %v", err)
	}

	s := &Server{
		mux:       http.NewServeMux(),
		templates: tmpl,
		caseStore: casestore.NewCaseStore(),
		caseFile:  caseFile,
	}
	s.routes()
	return s
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

// routes registers all HTTP routes.
func (s *Server) routes() {
	s.mux.HandleFunc("/", s.handleRoot)
	s.mux.HandleFunc("/init", s.handleInit)
	s.mux.HandleFunc("/sse/init", s.handleSSEInit)
	s.mux.HandleFunc("/api/init/respond", s.handleInitRespond)
}

// EnableInitMode enables Init Mode for first-time project setup.
// configState tells Ava whether this is a new project, incomplete config, or returning user.
func (s *Server) EnableInitMode(promptPath string, configState scaffold.ConfigState) {
	s.initMode = true
	s.promptPath = promptPath
	s.configState = configState
	s.conversation = agent.NewConversation()

	// Load base prompt for conversation history
	content, err := os.ReadFile(promptPath)
	if err == nil {
		s.basePrompt = string(content)
	}
}

// StaticDir sets the directory for serving static files.
func (s *Server) StaticDir(dir string) {
	fs := http.FileServer(http.Dir(dir))
	s.mux.Handle("/static/", http.StripPrefix("/static/", fs))
}

// PageData holds data passed to templates.
type PageData struct {
	Cases    []casestore.Case
	InitMode bool
}

// handleSSEInit handles SSE streaming for Ava during init.
func (s *Server) handleSSEInit(w http.ResponseWriter, r *http.Request) {
	if !s.initMode {
		http.Error(w, "Not in init mode", http.StatusBadRequest)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Start agent if not started (first connection)
	s.initMu.Lock()
	if !s.initStarted {
		s.initStarted = true
		// Build initial message based on config state
		// CRITICAL: Enforce English language in the initial message
		var initialMessage string
		switch s.configState {
		case scaffold.ConfigNew:
			initialMessage = "LANGUAGE: English (mandatory until user writes in another language)\n\nThis is a FIRST RUN - no .axiom/ directory existed. Follow the ONBOARDING FLOW. Introduce yourself and explain what you'll do. Write in English."
		case scaffold.ConfigIncomplete:
			initialMessage = "LANGUAGE: English (mandatory until user writes in another language)\n\nThe .axiom/ directory exists but config.json only has version (no verification commands). Treat this as FIRST RUN - follow the ONBOARDING FLOW. Introduce yourself and explain what you'll do. Write in English."
		case scaffold.ConfigComplete:
			initialMessage = "LANGUAGE: English (mandatory until user writes in another language)\n\nThis is a RETURNING USER - config.json has verification commands. Follow the RETURNING USER FLOW. Introduce yourself and offer help options. Write in English."
		}
		lines, done, err := agent.SpawnStreaming(s.promptPath, initialMessage)
		s.initLines = lines
		s.initDone = done
		s.initErr = err
		if err == nil {
			// Start background buffering
			go s.bufferAgentOutput(lines, done)
		}
	}
	err := s.initErr
	s.initMu.Unlock()

	if err != nil {
		_, _ = w.Write([]byte("event: error\ndata: " + err.Error() + "\n\n"))
		flusher.Flush()
		return
	}

	// Track how much we've sent
	sentCount := 0

	// Poll buffer and send new content
	for {
		s.initMu.Lock()
		bufLen := len(s.initOutput)
		complete := s.initComplete

		// Send any new entries
		for i := sentCount; i < bufLen; i++ {
			entry := s.initOutput[i]
			if entry.Type == "user" {
				// User message with styling (escape HTML)
				escaped := template.HTMLEscapeString(entry.Content)
				data := `<div class="border-t border-gray-700 my-4"></div>` +
					`<div class="py-2 px-3 bg-blue-900 bg-opacity-50 rounded-lg mb-4 text-blue-200">` +
					`<span class="font-semibold">You:</span> ` + escaped + `</div>`
				_, _ = w.Write([]byte("event: message\ndata: " + data + "\n\n"))
			} else {
				// Assistant output
				_, _ = w.Write([]byte("event: message\ndata: " + entry.Content + "\n\n"))
			}
		}
		sentCount = bufLen
		s.initMu.Unlock()

		flusher.Flush()

		// If complete, send done and exit
		if complete {
			_, _ = w.Write([]byte("event: done\ndata: complete\n\n"))
			flusher.Flush()
			return
		}

		// Check if client disconnected
		select {
		case <-r.Context().Done():
			return
		default:
		}

		// Small delay before polling again
		time.Sleep(50 * time.Millisecond)
	}
}

// handleInit handles GET /init for project setup.
func (s *Server) handleInit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err := s.templates.ExecuteTemplate(w, "init.html", nil)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}

// handleInitRespond handles POST /api/init/respond for user messages.
func (s *Server) handleInitRespond(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !s.initMode {
		http.Error(w, "Not in init mode", http.StatusBadRequest)
		return
	}

	// Parse user message
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}
	userMessage := r.FormValue("message")
	if userMessage == "" {
		http.Error(w, "Message required", http.StatusBadRequest)
		return
	}

	s.initMu.Lock()
	// Add user message to conversation and buffer
	s.conversation.AddMessage("user", userMessage)
	s.initOutput = append(s.initOutput, initEntry{Type: "user", Content: userMessage})

	// Reset complete flag for new response
	s.initComplete = false

	// Build prompt with history
	prompt := s.conversation.BuildPromptWithHistory(s.basePrompt)

	// Spawn new agent with conversation context
	s.initLines, s.initDone, s.initErr = agent.SpawnStreaming(s.promptPath, prompt+"\n\nUser's response: "+userMessage)

	// Start background buffering so no chunks are lost while SSE reconnects
	lines := s.initLines
	done := s.initDone
	s.initMu.Unlock()

	go s.bufferAgentOutput(lines, done)

	// Return success - client will reconnect to SSE
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// bufferAgentOutput reads all chunks from the agent and buffers them.
// This ensures no chunks are lost while SSE is disconnected.
func (s *Server) bufferAgentOutput(lines <-chan string, done <-chan error) {
	var fullResponse strings.Builder

	for chunk := range lines {
		s.initMu.Lock()
		s.initOutput = append(s.initOutput, initEntry{Type: "assistant", Content: chunk})
		s.initMu.Unlock()
		fullResponse.WriteString(chunk)
	}

	// Wait for completion
	<-done
	s.initMu.Lock()
	s.initComplete = true
	// Add assistant's full response to conversation history
	response := fullResponse.String()
	if response != "" {
		s.conversation.AddMessage("assistant", response)
		// Log the conversation to file
		s.logConversation()
	}
	s.initMu.Unlock()
}

// logConversation writes the conversation history to the agent's log directory.
func (s *Server) logConversation() {
	logDir := filepath.Join(".axiom", "agents", "ava", "logs")
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		log.Printf("failed to create log directory: %v", err)
		return
	}

	// Use timestamp-based log file
	logFile := filepath.Join(logDir, fmt.Sprintf("init-%s.jsonl", time.Now().Format("2006-01-02")))
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		log.Printf("failed to open log file: %v", err)
		return
	}
	defer func() { _ = f.Close() }()

	// Write each message as a JSON line
	for _, msg := range s.conversation.Messages {
		entry := map[string]string{
			"timestamp": time.Now().Format(time.RFC3339),
			"role":      msg.Role,
			"content":   msg.Content,
		}
		if data, err := json.Marshal(entry); err == nil {
			_, _ = f.Write(append(data, '\n'))
		}
	}
}

// handleRoot handles GET /.
func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	cases, err := s.caseStore.Load(s.caseFile)
	if err != nil {
		// Graceful degradation: show empty list if file missing
		cases = []casestore.Case{}
	}

	data := PageData{
		Cases:    cases,
		InitMode: s.initMode,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	err = s.templates.ExecuteTemplate(w, "layout.html", data)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
}
