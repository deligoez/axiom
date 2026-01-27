// Package web provides the HTTP server for AXIOM's web interface.
package web

import (
	"embed"
	"html/template"
	"log"
	"net/http"
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
	initMode   bool
	promptPath string
	initOnce   sync.Once
	initLines  <-chan string
	initDone   <-chan error
	initErr    error
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
}

// EnableInitMode enables Init Mode for first-time project setup.
func (s *Server) EnableInitMode(promptPath string) {
	s.initMode = true
	s.promptPath = promptPath
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

	// Spawn Ava once, store channels on server
	s.initOnce.Do(func() {
		s.initLines, s.initDone, s.initErr = agent.SpawnStreaming(s.promptPath, "Analyze this project and configure AXIOM.")
	})

	if s.initErr != nil {
		http.Error(w, s.initErr.Error(), http.StatusInternalServerError)
		return
	}

	if s.initLines == nil {
		http.Error(w, "Init failed to start", http.StatusInternalServerError)
		return
	}

	// Stream via SSE handler
	handler := NewSSEHandler(s.initLines, s.initDone)
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
