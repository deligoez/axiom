package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSSEHandler_ContentType(t *testing.T) {
	// Create a mock line source
	lines := make(chan string)
	done := make(chan error, 1)

	// Close immediately to test headers
	close(lines)
	done <- nil
	close(done)

	handler := NewSSEHandler(lines, done)
	req := httptest.NewRequest(http.MethodGet, "/sse/init", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "text/event-stream" {
		t.Errorf("expected Content-Type text/event-stream, got %s", contentType)
	}

	cacheControl := rec.Header().Get("Cache-Control")
	if cacheControl != "no-cache" {
		t.Errorf("expected Cache-Control no-cache, got %s", cacheControl)
	}
}

func TestSSEHandler_StreamsChunks(t *testing.T) {
	chunks := make(chan string, 3)
	done := make(chan error, 1)

	// Send test chunks (real-time streaming)
	chunks <- "Hello"
	chunks <- " World"
	chunks <- "!\n"
	close(chunks)
	done <- nil
	close(done)

	handler := NewSSEHandler(chunks, done)
	req := httptest.NewRequest(http.MethodGet, "/sse/init", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	body := rec.Body.String()

	// Check for explicit event names
	if !strings.Contains(body, "event: message") {
		t.Errorf("expected 'event: message' in response")
	}

	// Check for text chunks (raw text, newlines preserved by CSS)
	expectedChunks := []string{"Hello", " World", "!"}
	for _, expected := range expectedChunks {
		if !strings.Contains(body, expected) {
			t.Errorf("expected %q in response, got: %s", expected, body)
		}
	}

	// Check data format (raw text without HTML wrappers)
	if !strings.Contains(body, "data: Hello") {
		t.Errorf("expected raw text in data field, got: %s", body)
	}
}

func TestSSEHandler_SendsDoneEvent(t *testing.T) {
	lines := make(chan string)
	done := make(chan error, 1)

	close(lines)
	done <- nil
	close(done)

	handler := NewSSEHandler(lines, done)
	req := httptest.NewRequest(http.MethodGet, "/sse/init", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	body := rec.Body.String()
	if !strings.Contains(body, "event: done") {
		t.Errorf("expected 'event: done' in response, got: %s", body)
	}
}
