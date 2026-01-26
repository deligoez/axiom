package agent

import (
	"strings"
	"testing"
)

func TestAvaPromptTemplate_NotEmpty(t *testing.T) {
	if AvaPromptTemplate == "" {
		t.Error("AvaPromptTemplate is empty")
	}
}

func TestAvaPromptTemplate_ContainsAvaIdentity(t *testing.T) {
	if !strings.Contains(AvaPromptTemplate, "Analyst Ava") {
		t.Error("AvaPromptTemplate does not contain 'Analyst Ava'")
	}

	if !strings.Contains(AvaPromptTemplate, "Your Role: ANALYST") {
		t.Error("AvaPromptTemplate does not contain role definition")
	}
}
