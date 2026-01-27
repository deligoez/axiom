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

	// Check config state before scaffolding
	configState := scaffold.CheckConfigState(".")

	// Scaffold .axiom/ directory if it doesn't exist
	if configState == scaffold.ConfigNew {
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
	}

	server := web.NewServer(caseFile)
	server.StaticDir("web/static")

	// Enable init mode based on config state
	switch configState {
	case scaffold.ConfigNew:
		server.EnableInitMode(promptPath, configState)
		fmt.Println("First run detected - Ava will help with project setup.")
	case scaffold.ConfigIncomplete:
		server.EnableInitMode(promptPath, configState)
		fmt.Println("Incomplete config detected - Ava will complete setup.")
	case scaffold.ConfigComplete:
		// Don't show init modal for returning users with complete config
		fmt.Println("AXIOM configured - ready to use.")
	}

	fmt.Printf("AXIOM server starting on http://localhost%s\n", addr)

	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
