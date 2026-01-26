package web

import (
	"bufio"
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
	scanner := bufio.NewScanner(strings.NewReader(body))

	expectedLines := []string{"data: Hello", "data: World", "data: Done"}
	idx := 0

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue // Skip empty lines (SSE format)
		}
		if idx < len(expectedLines) {
			if line != expectedLines[idx] {
				t.Errorf("line %d: expected %q, got %q", idx, expectedLines[idx], line)
			}
			idx++
		}
	}

	if idx != len(expectedLines) {
		t.Errorf("expected %d lines, got %d", len(expectedLines), idx)
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
