// Package web provides the HTTP server for AXIOM's web interface.
package web

import (
	"embed"
	"html/template"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/deligoez/axiom/internal/agent"
	casestore "github.com/deligoez/axiom/internal/case"
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
	initMu       sync.Mutex
	initStarted  bool
	initLines    <-chan string
	initDone     <-chan error
	initErr      error
	conversation *agent.Conversation
	basePrompt   string
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
func (s *Server) EnableInitMode(promptPath string) {
	s.initMode = true
	s.promptPath = promptPath
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

	s.initMu.Lock()
	if !s.initStarted {
		// First time - spawn Ava
		s.initStarted = true
		s.initLines, s.initDone, s.initErr = agent.SpawnStreaming(s.promptPath, "Analyze this project and configure AXIOM.")
	}
	lines := s.initLines
	done := s.initDone
	err := s.initErr
	s.initMu.Unlock()

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if lines == nil {
		http.Error(w, "Init not ready", http.StatusServiceUnavailable)
		return
	}

	// Stream via SSE handler
	handler := NewSSEHandler(lines, done)
	handler.ServeHTTP(w, r)
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
	// Add user message to conversation
	s.conversation.AddMessage("user", userMessage)

	// Build prompt with history
	prompt := s.conversation.BuildPromptWithHistory(s.basePrompt)

	// Spawn new agent with conversation context
	s.initLines, s.initDone, s.initErr = agent.SpawnStreaming(s.promptPath, prompt+"\n\nUser's response: "+userMessage)
	s.initMu.Unlock()

	// Return success - client will reconnect to SSE
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
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
