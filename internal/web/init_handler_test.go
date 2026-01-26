package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestInitHandler_ReturnsHTML(t *testing.T) {
	s := NewServer("test.jsonl")
	req := httptest.NewRequest(http.MethodGet, "/init", http.NoBody)
	rec := httptest.NewRecorder()

	s.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	contentType := rec.Header().Get("Content-Type")
	if !strings.Contains(contentType, "text/html") {
		t.Errorf("expected Content-Type text/html, got %s", contentType)
	}
}

func TestInitHandler_ContainsAvaHeader(t *testing.T) {
	s := NewServer("test.jsonl")
	req := httptest.NewRequest(http.MethodGet, "/init", http.NoBody)
	rec := httptest.NewRecorder()

	s.ServeHTTP(rec, req)

	body := rec.Body.String()
	if !strings.Contains(body, "AVA") {
		t.Errorf("expected 'AVA' in response body")
	}
}

func TestInitHandler_ContainsSSEConnection(t *testing.T) {
	s := NewServer("test.jsonl")
	req := httptest.NewRequest(http.MethodGet, "/init", http.NoBody)
	rec := httptest.NewRecorder()

	s.ServeHTTP(rec, req)

	body := rec.Body.String()
	// Should have hx-sse for SSE connection
	if !strings.Contains(body, "hx-ext=\"sse\"") && !strings.Contains(body, "sse-connect") {
		t.Errorf("expected SSE connection in response body")
	}
}
