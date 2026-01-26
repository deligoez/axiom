package web

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestServer_GetRoot_Returns200(t *testing.T) {
	// Arrange - use nonexistent file (graceful degradation)
	server := NewServer("/nonexistent/cases.jsonl")
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
	server := NewServer("/nonexistent/cases.jsonl")
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

func TestServer_GetRoot_ContainsCases(t *testing.T) {
	// Arrange - create temp file with test cases
	dir := t.TempDir()
	caseFile := filepath.Join(dir, "cases.jsonl")

	content := `{"id":"task-001","type":"task","status":"done","content":"Test case one","createdAt":"2026-01-26T10:00:00Z"}
{"id":"task-002","type":"task","status":"active","content":"Test case two","createdAt":"2026-01-26T11:00:00Z"}
`
	err := os.WriteFile(caseFile, []byte(content), 0o644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	server := NewServer(caseFile)
	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	rec := httptest.NewRecorder()

	// Act
	server.ServeHTTP(rec, req)

	// Assert
	body := rec.Body.String()

	expectedCases := []string{
		"Test case one",
		"Test case two",
	}

	for _, caseContent := range expectedCases {
		if !strings.Contains(body, caseContent) {
			t.Errorf("response should contain case content %q", caseContent)
		}
	}
}
