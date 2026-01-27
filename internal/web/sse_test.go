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

func TestSSEHandler_StreamsLines(t *testing.T) {
	lines := make(chan string, 3)
	done := make(chan error, 1)

	// Send test lines
	lines <- "Hello"
	lines <- "World"
	lines <- "Done"
	close(lines)
	done <- nil
	close(done)

	handler := NewSSEHandler(lines, done)
	req := httptest.NewRequest(http.MethodGet, "/sse/init", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	body := rec.Body.String()

	// Check for explicit event names (htmx format)
	if !strings.Contains(body, "event: message") {
		t.Errorf("expected 'event: message' in response")
	}

	// Check for data lines (wrapped in divs for display)
	expectedData := []string{"Hello", "World", "Done"}
	for _, expected := range expectedData {
		if !strings.Contains(body, expected) {
			t.Errorf("expected %q in response, got: %s", expected, body)
		}
	}

	// Check for div wrapper
	if !strings.Contains(body, "<div class=\"py-1\">") {
		t.Errorf("expected div wrapper in response")
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
