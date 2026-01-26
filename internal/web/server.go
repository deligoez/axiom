// Package web provides the HTTP server for AXIOM's web interface.
package web

import "net/http"

// Server is the HTTP server for AXIOM.
type Server struct {
	mux *http.ServeMux
}

// NewServer creates a new AXIOM web server.
func NewServer() *Server {
	s := &Server{
		mux: http.NewServeMux(),
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
}

// handleRoot handles GET /.
func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("AXIOM")) // Error ignored: response write failure is unrecoverable
}
