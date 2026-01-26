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
	server := NewServer("/nonexistent/tasks.jsonl")
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
	server := NewServer("/nonexistent/tasks.jsonl")
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

func TestServer_GetRoot_ContainsTasks(t *testing.T) {
	// Arrange - create temp file with test tasks
	dir := t.TempDir()
	taskFile := filepath.Join(dir, "tasks.jsonl")

	content := `{"id":"task-001","title":"Test task one","status":"done"}
{"id":"task-002","title":"Test task two","status":"active"}
`
	err := os.WriteFile(taskFile, []byte(content), 0o644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	server := NewServer(taskFile)
	req := httptest.NewRequest(http.MethodGet, "/", http.NoBody)
	rec := httptest.NewRecorder()

	// Act
	server.ServeHTTP(rec, req)

	// Assert
	body := rec.Body.String()

	expectedTasks := []string{
		"Test task one",
		"Test task two",
	}

	for _, taskTitle := range expectedTasks {
		if !strings.Contains(body, taskTitle) {
			t.Errorf("response should contain task title %q", taskTitle)
		}
	}
}
