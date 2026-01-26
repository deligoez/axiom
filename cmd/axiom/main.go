// Package main is the entry point for the AXIOM CLI.
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/deligoez/axiom/internal/web"
)

func main() {
	addr := ":8080"
	caseFile := ".axiom/cases.jsonl"

	server := web.NewServer(caseFile)
	server.StaticDir("web/static")

	fmt.Printf("AXIOM server starting on http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
