// Package main is the entry point for the AXIOM CLI.
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/deligoez/axiom/internal/scaffold"
	"github.com/deligoez/axiom/internal/web"
)

func main() {
	addr := ":8080"
	caseFile := ".axiom/cases.jsonl"
	promptPath := ".axiom/agents/ava/prompt.md"
	initMode := false

	// Scaffold .axiom/ directory if it doesn't exist
	if !scaffold.Exists(".") {
		if err := scaffold.Scaffold("."); err != nil {
			log.Fatalf("scaffold error: %v", err)
		}
		if err := scaffold.WriteConfig(".axiom"); err != nil {
			log.Fatalf("config error: %v", err)
		}
		if err := scaffold.WriteAvaPrompt(".axiom"); err != nil {
			log.Fatalf("prompt error: %v", err)
		}
		fmt.Println("Created .axiom/ directory")
		initMode = true
	}

	server := web.NewServer(caseFile)
	server.StaticDir("web/static")

	// Enable init mode if first run (modal will show automatically)
	if initMode {
		server.EnableInitMode(promptPath)
		fmt.Println("First run detected - Ava will help with project setup.")
	}

	fmt.Printf("AXIOM server starting on http://localhost%s\n", addr)

	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
