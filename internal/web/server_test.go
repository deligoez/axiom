package web

import (
	"net/http"
	"net/http/httptest"
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
