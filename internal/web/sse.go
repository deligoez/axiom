package web

import (
	"fmt"
	"html/template"
	"net/http"
)

// SSEHandler streams lines from a channel as Server-Sent Events.
type SSEHandler struct {
	lines <-chan string
	done  <-chan error
}

// NewSSEHandler creates an SSE handler that streams from the given channels.
// The lines channel provides content to stream, done signals completion.
func NewSSEHandler(lines <-chan string, done <-chan error) *SSEHandler {
	return &SSEHandler{
		lines: lines,
		done:  done,
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

	// Stream lines with explicit event name for htmx
	// Wrap each line in a div for proper display
	for line := range h.lines {
		// Escape HTML and wrap in div
		escapedLine := template.HTMLEscapeString(line)
		_, _ = fmt.Fprintf(w, "event: message\ndata: <div class=\"py-1\">%s</div>\n\n", escapedLine)
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
