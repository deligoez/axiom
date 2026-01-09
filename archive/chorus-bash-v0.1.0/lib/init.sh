#!/usr/bin/env bash
# chorus init - Initialize project for multi-agent development

TEMPLATES_DIR="$CHORUS_ROOT/templates"

# =============================================================================
# Init functions
# =============================================================================

init_agent_dir() {
    ensure_dir ".agent"

    # Create learnings.md if not exists
    if copy_if_missing "$TEMPLATES_DIR/learnings.md.template" ".agent/learnings.md"; then
        log_success ".agent/learnings.md"
    else
        log_success ".agent/learnings.md (exists)"
    fi

    # Create progress.txt if not exists
    if copy_if_missing "$TEMPLATES_DIR/progress.txt.template" ".agent/progress.txt"; then
        log_success ".agent/progress.txt"
    else
        log_success ".agent/progress.txt (exists)"
    fi
}

init_agents_md() {
    if copy_if_missing "$TEMPLATES_DIR/AGENTS.md.template" "AGENTS.md"; then
        log_success "AGENTS.md"
    else
        log_success "AGENTS.md (exists)"
    fi
}

init_gitignore() {
    local additions=(
        ".agent/scratchpad.md"
        ".worktrees/"
        ".beads/beads.db"
    )

    touch .gitignore

    local added=0
    for line in "${additions[@]}"; do
        if ! grep -qxF "$line" .gitignore; then
            echo "$line" >> .gitignore
            ((added++))
        fi
    done

    if [[ $added -gt 0 ]]; then
        log_success ".gitignore (+$added entries)"
    else
        log_success ".gitignore (up to date)"
    fi
}

init_scripts() {
    ensure_dir "scripts"

    if copy_if_missing "$TEMPLATES_DIR/chorus-loop.sh.template" "scripts/chorus-loop.sh"; then
        chmod +x "scripts/chorus-loop.sh"
        log_success "scripts/chorus-loop.sh"
    else
        log_success "scripts/chorus-loop.sh (exists)"
    fi
}

init_hooks() {
    ensure_dir ".claude/hooks"

    # Copy hook files
    if copy_if_missing "$TEMPLATES_DIR/hooks/session-start.sh" ".claude/hooks/session-start.sh"; then
        chmod +x ".claude/hooks/session-start.sh"
        log_success ".claude/hooks/session-start.sh"
    else
        log_success ".claude/hooks/session-start.sh (exists)"
    fi

    if copy_if_missing "$TEMPLATES_DIR/hooks/stop-completion.sh" ".claude/hooks/stop-completion.sh"; then
        chmod +x ".claude/hooks/stop-completion.sh"
        log_success ".claude/hooks/stop-completion.sh"
    else
        log_success ".claude/hooks/stop-completion.sh (exists)"
    fi

    # Create settings.json if not exists
    if [[ ! -f ".claude/settings.json" ]]; then
        cat > ".claude/settings.json" << 'EOF'
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
        log_success ".claude/settings.json"
    else
        log_success ".claude/settings.json (exists)"
    fi
}

init_beads() {
    if command_exists bd; then
        if [[ ! -d ".beads" ]]; then
            bd init 2>/dev/null || true
            log_success ".beads/"
        else
            log_success ".beads/ (exists)"
        fi
    else
        log_warn "Beads (bd) not installed - skipping"
    fi
}

show_next_steps() {
    local with_beads="$1"

    echo ""
    echo "Done! Next steps:"
    echo "  1. Edit AGENTS.md with your project details"
    if [[ "$with_beads" == false ]]; then
        echo "  2. Run: chorus init --with-beads (for task management)"
        echo "  3. Start: chorus loop \"your first task\""
    else
        echo "  2. Create a task: bd create \"Your first task\" -p 1"
        echo "  3. Start: chorus loop"
    fi
}

# =============================================================================
# Main
# =============================================================================

init_main() {
    local with_hooks=false
    local with_beads=false
    local non_interactive=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-hooks)
                with_hooks=true
                shift
                ;;
            --with-beads)
                with_beads=true
                shift
                ;;
            --non-interactive)
                non_interactive=true
                shift
                ;;
            --all)
                with_hooks=true
                with_beads=true
                shift
                ;;
            -h|--help)
                echo "Usage: chorus init [options]"
                echo ""
                echo "Options:"
                echo "  --with-hooks       Create Claude Code hooks"
                echo "  --with-beads       Initialize Beads task management"
                echo "  --all              Enable all options"
                echo "  --non-interactive  Skip prompts"
                echo "  -h, --help         Show this help"
                return 0
                ;;
            *)
                log_error "Unknown option: $1"
                return 1
                ;;
        esac
    done

    echo "Initializing Chorus..."
    echo ""

    # Core setup
    init_agent_dir
    init_agents_md
    init_scripts
    init_gitignore

    # Optional setup
    if [[ "$with_hooks" == true ]]; then
        init_hooks
    fi

    if [[ "$with_beads" == true ]]; then
        init_beads
    fi

    show_next_steps "$with_beads"
}
