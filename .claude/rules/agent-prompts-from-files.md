# Agent Prompts From Files Rule

**CRITICAL: Never hardcode agent prompts, rules, or instructions in Go code.**

## Rule

All text content sent to agents MUST be loaded from external files:
- Prompts → `.md` or `.md.tmpl` files
- Rules → `.md` files
- System instructions → text files
- Persona definitions → template files

## Pattern

```go
// WRONG - hardcoded prompt
prompt := "You are an assistant that helps with coding..."
client.Execute(ctx, prompt)

// RIGHT - loaded from file via embed
//go:embed prompts/agent-name.md.tmpl
var AgentPromptTemplate string

// Or loaded at runtime
prompt, _ := os.ReadFile(".axiom/agents/echo/prompt.md")
```

## File Locations

| Content Type | Location | Format |
|--------------|----------|--------|
| Agent prompts | `internal/agent/prompts/*.md.tmpl` | Go template |
| Persona definitions | `internal/agent/prompts/*.md.tmpl` | Go template |
| System rules | `.axiom/rules/*.md` | Markdown |
| User-facing prompts | `.axiom/agents/*/prompt.md` | Markdown |

## Why

1. **Maintainability** - Prompts can be edited without recompiling
2. **Readability** - Long prompts are hard to read in Go strings
3. **Versioning** - Prompt changes are visible in git diff
4. **Templating** - Can use Go templates for dynamic content
5. **Separation** - Content separate from logic

## Existing Example

```go
// internal/agent/embed.go
//go:embed prompts/ava.md.tmpl
var AvaPromptTemplate string

// internal/scaffold/scaffold.go
func WriteAvaPrompt(axiomDir string) error {
    promptPath := filepath.Join(axiomDir, "agents", "ava", "prompt.md")
    return os.WriteFile(promptPath, []byte(agent.AvaPromptTemplate), 0o644)
}
```

## Template Variables

When using `.tmpl` files, document available variables:

```markdown
<!-- prompts/echo.md.tmpl -->
# Echo Agent

Task ID: {{.TaskID}}
Working Directory: {{.WorkDir}}
Parent Case: {{.ParentCaseID}}

## Instructions
...
```

## Enforcement

When reviewing agent-related code:
1. Check for string literals containing instructions
2. Ensure all prompts use `//go:embed` or file loading
3. Verify template variables are documented
