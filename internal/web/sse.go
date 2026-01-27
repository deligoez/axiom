package web

import (
	"fmt"
	"html/template"
	"net/http"
	"strings"
)

// SSEHandler streams text chunks from a channel as Server-Sent Events.
type SSEHandler struct {
	chunks <-chan string
	done   <-chan error
}

// NewSSEHandler creates an SSE handler that streams from the given channels.
// The chunks channel provides text fragments to stream, done signals completion.
func NewSSEHandler(chunks <-chan string, done <-chan error) *SSEHandler {
	return &SSEHandler{
		chunks: chunks,
		done:   done,
	}
}

// ServeHTTP implements http.Handler for SSE streaming.
func (h *SSEHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Stream text chunks in real-time
	// Each chunk is a small piece of text (possibly mid-word)
	for chunk := range h.chunks {
		// Escape HTML and convert newlines to <br> for display
		escaped := template.HTMLEscapeString(chunk)
		escaped = strings.ReplaceAll(escaped, "\n", "<br>")

		// Send as span (inline element since chunks may be partial words)
		_, _ = fmt.Fprintf(w, "event: message\ndata: <span>%s</span>\n\n", escaped)
		flusher.Flush()
	}

	// Wait for completion and send done event
	err := <-h.done
	if err != nil {
		_, _ = fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
	} else {
		_, _ = fmt.Fprintf(w, "event: done\ndata: complete\n\n")
	}
	flusher.Flush()
}
