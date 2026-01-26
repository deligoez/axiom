package web

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServer_GetRoot_Returns200(t *testing.T) {
	// Arrange
	server := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	rec := httptest.NewRecorder()

	// Act
	server.ServeHTTP(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestServer_GetRoot_ReturnsHTML(t *testing.T) {
	// Arrange
	server := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	rec := httptest.NewRecorder()

	// Act
	server.ServeHTTP(rec, req)

	// Assert
	body := rec.Body.String()

	// Check content type
	contentType := rec.Header().Get("Content-Type")
	if contentType != "text/html; charset=utf-8" {
		t.Errorf("got content-type %q, want %q", contentType, "text/html; charset=utf-8")
	}

	// Check for header
	if !strings.Contains(body, "AXIOM") {
		t.Error("response should contain 'AXIOM' in header")
	}

	// Check for footer
	if !strings.Contains(body, "2025 AXIOM") {
		t.Error("response should contain '2025 AXIOM' in footer")
	}
}
