# Chorus CLI Implementation Plan

**Date:** 2026-01-09
**Status:** Planning
**Author:** Claude + Human

---

## Goal

Create a `chorus` CLI tool that makes multi-agent development setup effortless.

**Success Criteria:**
- [ ] `chorus init` creates all necessary files in <5 seconds
- [ ] `chorus loop` runs Ralph Wiggum pattern autonomously
- [ ] `chorus squad` starts multiple agents in worktrees
- [ ] All commands have tests (>80% coverage goal)
- [ ] Works on fresh Ubuntu 24.04 VPS

---

## Architecture

```
chorus/
├── bin/
│   └── chorus                    # Main CLI entry point
├── lib/
│   ├── common.sh                 # Shared functions
│   ├── init.sh                   # chorus init
│   ├── loop.sh                   # chorus loop (Ralph Wiggum)
│   ├── squad.sh                  # chorus squad
│   └── status.sh                 # chorus status
├── templates/
│   ├── AGENTS.md.template        # (existing)
│   ├── learnings.md.template     # Empty learnings file
│   ├── progress.txt.template     # Iteration log format
│   ├── gitignore.append          # Lines to add to .gitignore
│   └── hooks/
│       ├── session-start.sh      # Load context hook
│       └── stop-completion.sh    # Check completion hook
├── test/
│   ├── test_helper/
│   │   └── bats-setup.bash       # Test helpers
│   ├── init.bats                 # chorus init tests
│   ├── loop.bats                 # chorus loop tests
│   ├── squad.bats                # chorus squad tests
│   └── fixtures/
│       └── sample-project/       # Test fixture
├── vps-setup/
│   └── bootstrap.sh              # (existing, update)
├── install.sh                    # CLI installer
└── Makefile                      # Test runner, install targets
```

---

## Phase 1: Foundation (TDD Setup)

### 1.1 Install Bats-core and helpers

```bash
# In chorus repo
git submodule add https://github.com/bats-core/bats-core.git test/bats
git submodule add https://github.com/bats-core/bats-support.git test/test_helper/bats-support
git submodule add https://github.com/bats-core/bats-assert.git test/test_helper/bats-assert
git submodule add https://github.com/bats-core/bats-file.git test/test_helper/bats-file
```

### 1.2 Create test helper

```bash
# test/test_helper/bats-setup.bash
load 'bats-support/load'
load 'bats-assert/load'
load 'bats-file/load'

# Create temp directory for each test
setup() {
    TEST_TEMP_DIR="$(mktemp -d)"
    cd "$TEST_TEMP_DIR"
}

teardown() {
    rm -rf "$TEST_TEMP_DIR"
}
```

### 1.3 Makefile

```makefile
.PHONY: test install

test:
	./test/bats/bin/bats test/*.bats

install:
	./install.sh
```

---

## Phase 2: chorus init (TDD)

### 2.1 Write tests first

```bash
# test/init.bats
#!/usr/bin/env bats

load 'test_helper/bats-setup'

@test "chorus init creates .agent directory" {
    run chorus init --non-interactive
    assert_success
    assert_dir_exists ".agent"
}

@test "chorus init creates learnings.md" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists ".agent/learnings.md"
}

@test "chorus init creates progress.txt" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists ".agent/progress.txt"
}

@test "chorus init creates AGENTS.md" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists "AGENTS.md"
}

@test "chorus init updates .gitignore" {
    echo "# existing" > .gitignore
    run chorus init --non-interactive
    assert_success
    assert_file_contains ".gitignore" ".agent/scratchpad.md"
    assert_file_contains ".gitignore" ".worktrees/"
}

@test "chorus init is idempotent" {
    run chorus init --non-interactive
    run chorus init --non-interactive
    assert_success
    # Should not duplicate content
}

@test "chorus init --with-hooks creates hooks" {
    run chorus init --non-interactive --with-hooks
    assert_success
    assert_file_exists ".claude/hooks/session-start.sh"
    assert_file_exists ".claude/hooks/stop-completion.sh"
    assert_file_exists ".claude/settings.json"
}

@test "chorus init --with-beads runs bd init" {
    # Skip if beads not installed
    if ! command -v bd &> /dev/null; then
        skip "Beads not installed"
    fi
    run chorus init --non-interactive --with-beads
    assert_success
    assert_dir_exists ".beads"
}
```

### 2.2 Implement lib/init.sh

```bash
#!/bin/bash
# lib/init.sh - chorus init implementation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$(dirname "$SCRIPT_DIR")/templates"

init_agent_dir() {
    mkdir -p .agent

    # Create learnings.md if not exists
    if [[ ! -f .agent/learnings.md ]]; then
        cp "$TEMPLATES_DIR/learnings.md.template" .agent/learnings.md
    fi

    # Create progress.txt if not exists
    if [[ ! -f .agent/progress.txt ]]; then
        cp "$TEMPLATES_DIR/progress.txt.template" .agent/progress.txt
    fi
}

init_agents_md() {
    if [[ ! -f AGENTS.md ]]; then
        cp "$TEMPLATES_DIR/AGENTS.md.template" AGENTS.md
    fi
}

init_gitignore() {
    local additions=(
        ".agent/scratchpad.md"
        ".worktrees/"
        ".beads/beads.db"
    )

    touch .gitignore

    for line in "${additions[@]}"; do
        if ! grep -qxF "$line" .gitignore; then
            echo "$line" >> .gitignore
        fi
    done
}

init_hooks() {
    mkdir -p .claude/hooks

    cp "$TEMPLATES_DIR/hooks/session-start.sh" .claude/hooks/
    cp "$TEMPLATES_DIR/hooks/stop-completion.sh" .claude/hooks/
    chmod +x .claude/hooks/*.sh

    # Create settings.json if not exists
    if [[ ! -f .claude/settings.json ]]; then
        cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/stop-completion.sh"
      }]
    }]
  }
}
EOF
    fi
}

init_beads() {
    if command -v bd &> /dev/null; then
        bd init 2>/dev/null || true
    else
        echo "Warning: Beads (bd) not installed. Skipping bd init."
    fi
}

main() {
    local with_hooks=false
    local with_beads=false
    local non_interactive=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-hooks) with_hooks=true; shift ;;
            --with-beads) with_beads=true; shift ;;
            --non-interactive) non_interactive=true; shift ;;
            --all) with_hooks=true; with_beads=true; shift ;;
            *) echo "Unknown option: $1"; exit 1 ;;
        esac
    done

    echo "Initializing Chorus..."

    init_agent_dir
    echo "  ✓ .agent/"

    init_agents_md
    echo "  ✓ AGENTS.md"

    init_gitignore
    echo "  ✓ .gitignore"

    if [[ "$with_hooks" == true ]]; then
        init_hooks
        echo "  ✓ .claude/hooks/"
    fi

    if [[ "$with_beads" == true ]]; then
        init_beads
        echo "  ✓ .beads/"
    fi

    echo ""
    echo "Done! Next steps:"
    echo "  1. Edit AGENTS.md with your project details"
    if [[ "$with_beads" == false ]]; then
        echo "  2. Run: chorus init --with-beads (for task management)"
    fi
    echo "  3. Start: chorus loop \"your first task\""
}

main "$@"
```

---

## Phase 3: chorus loop (TDD)

### 3.1 Write tests first

```bash
# test/loop.bats

@test "chorus loop requires task argument" {
    run chorus loop
    assert_failure
    assert_output --partial "Usage:"
}

@test "chorus loop creates progress entry" {
    run chorus loop --dry-run "Test task"
    assert_success
    assert_file_contains ".agent/progress.txt" "Test task"
}

@test "chorus loop respects max-iterations" {
    run chorus loop --max-iterations 1 --dry-run "Test"
    assert_success
}
```

### 3.2 Implement lib/loop.sh

Ralph Wiggum pattern implementation:
1. Create/load PROMPT.md with task
2. Run agent
3. Check completion via hook or progress.txt
4. Repeat until done or max iterations

---

## Phase 4: chorus squad (TDD)

### 4.1 Write tests first

```bash
# test/squad.bats

@test "chorus squad creates worktrees" {
    git init
    run chorus squad --dry-run --agents claude,codex
    assert_success
}

@test "chorus squad validates agent names" {
    run chorus squad --agents invalid-agent
    assert_failure
}
```

### 4.2 Implement lib/squad.sh

Multi-agent orchestration:
1. Create worktrees per agent
2. Spawn agent processes
3. Monitor completion
4. Merge when done

---

## Phase 5: Templates

### 5.1 templates/learnings.md.template

```markdown
# Project Learnings

> Append-only. New entries at bottom of relevant section.

## Architecture

## Performance

## Testing

## Gotchas
```

### 5.2 templates/progress.txt.template

```
# Chorus Progress Log
# Format: Each iteration is logged below
# Write "STATUS: DONE" when task is complete

```

### 5.3 templates/hooks/session-start.sh

```bash
#!/bin/bash
# Load context at session start

LEDGER=$(find thoughts/ledgers -name "CONTINUITY_*.md" 2>/dev/null | head -1)

if [[ -n "$LEDGER" ]]; then
    echo "📖 Ledger found: $LEDGER"
fi

if [[ -f .agent/learnings.md ]]; then
    LEARNING_COUNT=$(grep -c "^-" .agent/learnings.md 2>/dev/null || echo 0)
    echo "📚 Learnings: $LEARNING_COUNT entries"
fi

if [[ -f .agent/progress.txt ]]; then
    if grep -q "STATUS: DONE" .agent/progress.txt; then
        echo "✅ Previous task completed"
    else
        echo "⏳ Task in progress"
    fi
fi

echo '{"result": "continue"}'
```

### 5.4 templates/hooks/stop-completion.sh

```bash
#!/bin/bash
# Check if task is actually complete before allowing exit

PROGRESS_FILE=".agent/progress.txt"

# Check if explicitly marked done
if [[ -f "$PROGRESS_FILE" ]] && grep -q "STATUS: DONE" "$PROGRESS_FILE"; then
    echo '{"result": "continue"}'
    exit 0
fi

# Check if tests pass (if test command exists)
if [[ -f package.json ]] && command -v npm &> /dev/null; then
    if npm test &> /dev/null; then
        echo '{"result": "continue"}'
        exit 0
    fi
fi

# Not done - block exit and provide guidance
cat << 'EOF'
{
  "result": "block",
  "message": "Task not marked complete. Either:\n1. Write 'STATUS: DONE' to .agent/progress.txt\n2. Ensure all tests pass\n3. Use --force to exit anyway"
}
EOF
```

---

## Phase 6: Installation

### 6.1 install.sh

```bash
#!/bin/bash
# Install chorus CLI

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/usr/local}"
REPO_URL="https://github.com/deligoez/chorus"

echo "Installing Chorus CLI..."

# Clone or update repo
if [[ -d /opt/chorus ]]; then
    cd /opt/chorus && git pull
else
    sudo git clone "$REPO_URL" /opt/chorus
fi

# Create symlink
sudo ln -sf /opt/chorus/bin/chorus "$INSTALL_DIR/bin/chorus"

echo "✓ Chorus installed to $INSTALL_DIR/bin/chorus"
echo "Run 'chorus --help' to get started"
```

### 6.2 Update vps-setup/bootstrap.sh

Add at end:
```bash
# Install Chorus CLI
curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/install.sh | bash
```

---

## Phase 7: CI/CD

### 7.1 .github/workflows/test.yml

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Run tests
        run: make test

      - name: Test install
        run: |
          sudo ./install.sh
          chorus --version
```

---

## Implementation Order

1. **Foundation** - Bats setup, Makefile, test helper
2. **chorus init** - Tests first, then implementation
3. **Templates** - All template files
4. **chorus loop** - Tests first, then implementation
5. **chorus squad** - Tests first, then implementation
6. **Installation** - install.sh, update bootstrap.sh
7. **CI/CD** - GitHub Actions workflow

---

## Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Bats | Individual functions |
| Integration | Bats | Full commands |
| E2E | Docker | Fresh VPS simulation |

### E2E Test (Docker)

```dockerfile
FROM ubuntu:24.04

# Simulate fresh VPS
RUN apt-get update && apt-get install -y curl git

# Run bootstrap
RUN curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/vps-setup/bootstrap.sh | bash

# Test chorus
WORKDIR /test-project
RUN git init && chorus init --all
```

---

## Open Questions

- [ ] Should `chorus loop` use Stop hook or external loop?
- [ ] How to handle different agents in `chorus squad`?
- [ ] Should we support Windows (Git Bash)?

---

## References

- [Bats-core](https://github.com/bats-core/bats-core)
- [Ralph Wiggum Pattern](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
- [ShellSpec Comparison](https://shellspec.info/comparison.html)
