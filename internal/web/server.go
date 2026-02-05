// Package web provides the HTTP server for AXIOM's web interface.
package web

import (
	"bytes"
	"context"
	"embed"
	"html/template"
	"log"
	"net/http"
	"os"
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
	initMode    bool
	promptPath  string
	configState scaffold.ConfigState
	initMu      sync.Mutex

	// Interactive agent (SDK-based)
	initAgent    *agent.AgentClient
	initCtx      context.Context
	initCancel   context.CancelFunc
	initErr      error
	initComplete bool

	// Output buffer for SSE streaming and page refresh persistence
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
	WorkDir  string
}

// buildInitialMessage creates the initial message based on config state.
func (s *Server) buildInitialMessage() string {
	switch s.configState {
	case scaffold.ConfigNew:
		return "LANGUAGE: English (mandatory until user writes in another language)\n\nThis is a FIRST RUN - no .axiom/ directory existed. Follow the ONBOARDING FLOW. Introduce yourself and explain what you'll do. Write in English."
	case scaffold.ConfigIncomplete:
		return "LANGUAGE: English (mandatory until user writes in another language)\n\nThe .axiom/ directory exists but config.json only has version (no verification commands). Treat this as FIRST RUN - follow the ONBOARDING FLOW. Introduce yourself and explain what you'll do. Write in English."
	case scaffold.ConfigComplete:
		return "LANGUAGE: English (mandatory until user writes in another language)\n\nThis is a RETURNING USER - config.json has verification commands. Follow the RETURNING USER FLOW. Introduce yourself and offer help options. Write in English."
	default:
		return "LANGUAGE: English. Introduce yourself and help the user."
	}
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
	if s.initAgent == nil && s.initErr == nil {
		initialMessage := s.buildInitialMessage()
		config := &agent.AgentConfig{
			Model:           "claude-sonnet-4-20250514",
			Verbose:         true,
			SkipPermissions: true,
		}
		agentInstance, err := agent.NewAgentClient(config)
		if err != nil {
			s.initErr = err
		} else {
			s.initAgent = agentInstance
			s.initCtx, s.initCancel = context.WithCancel(context.Background())
			// Start buffering the initial response
			go s.bufferAgentOutput(initialMessage)
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
				// Assistant output - SSE requires each line to have "data: " prefix
				// Replace newlines with SSE-compatible format
				content := strings.ReplaceAll(entry.Content, "\n", "\ndata: ")
				_, _ = w.Write([]byte("event: message\ndata: " + content + "\n\n"))
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
	if s.initAgent == nil {
		s.initMu.Unlock()
		http.Error(w, "Agent not initialized", http.StatusInternalServerError)
		return
	}

	// Add user message to buffer for display
	s.initOutput = append(s.initOutput, initEntry{Type: "user", Content: userMessage})

	// Reset complete flag for new response
	s.initComplete = false
	s.initMu.Unlock()

	// Start buffering the new response (Execute handles the query)
	go s.bufferAgentOutput(userMessage)

	// Return success - client will see new content via SSE
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// bufferAgentOutput reads messages from the agent and buffers them for SSE.
func (s *Server) bufferAgentOutput(prompt string) {
	s.initMu.Lock()
	if s.initAgent == nil {
		s.initMu.Unlock()
		return
	}
	agentClient := s.initAgent
	ctx := s.initCtx
	s.initMu.Unlock()

	// Execute the prompt and stream messages
	msgChan, errChan := agentClient.Execute(ctx, prompt)

	// Read all messages and buffer them
	for {
		select {
		case msg, ok := <-msgChan:
			if !ok {
				// Channel closed, we're done
				s.initMu.Lock()
				s.initComplete = true
				s.initMu.Unlock()
				return
			}
			if msg.Text != "" {
				s.initMu.Lock()
				s.initOutput = append(s.initOutput, initEntry{Type: "assistant", Content: msg.Text})
				s.initMu.Unlock()
			}
		case err, ok := <-errChan:
			if ok && err != nil {
				s.initMu.Lock()
				s.initErr = err
				s.initComplete = true
				s.initMu.Unlock()
			}
			return
		case <-ctx.Done():
			return
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

	workDir, _ := os.Getwd()
	data := PageData{
		Cases:    cases,
		InitMode: s.initMode,
		WorkDir:  workDir,
	}

	// Execute to buffer first to handle errors cleanly
	var buf bytes.Buffer
	err = s.templates.ExecuteTemplate(&buf, "layout.html", data)
	if err != nil {
		log.Printf("Template error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = buf.WriteTo(w)
}

// Shutdown gracefully closes the init agent if running.
func (s *Server) Shutdown() {
	s.initMu.Lock()
	defer s.initMu.Unlock()
	if s.initCancel != nil {
		s.initCancel()
	}
	if s.initAgent != nil {
		_ = s.initAgent.Close()
		s.initAgent = nil
	}
}
