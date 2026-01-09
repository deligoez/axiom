#!/usr/bin/env bash
# chorus loop - Run autonomous loop (Ralph Wiggum pattern)

TEMPLATES_DIR="$CHORUS_ROOT/templates"

# =============================================================================
# Prompt generation
# =============================================================================

generate_prompt() {
    local task="$1"
    local task_id="$2"
    local criteria="$3"
    local prompt_file=".agent/PROMPT.md"

    cat > "$prompt_file" << EOF
# Task

$task
EOF

    if [[ -n "$task_id" ]]; then
        cat >> "$prompt_file" << EOF

## Task ID

$task_id
EOF
    fi

    cat >> "$prompt_file" << EOF

## Completion Criteria

EOF

    if [[ -n "$criteria" ]]; then
        echo "$criteria" >> "$prompt_file"
        echo "" >> "$prompt_file"
    fi

    cat >> "$prompt_file" << EOF
When the task is complete:
1. Write "STATUS: DONE" to .agent/progress.txt
2. Include a brief summary of what was accomplished

If blocked:
1. Write "STATUS: BLOCKED" to .agent/progress.txt
2. Describe what is blocking progress

## Progress

Check .agent/progress.txt for previous iteration notes.
Update it with your progress after each significant step.

## Instructions

1. Read .agent/progress.txt to understand previous work
2. Continue from where the last iteration left off
3. Make incremental progress toward the goal
4. Commit your changes frequently
5. Update progress.txt with what you accomplished
EOF
}

# =============================================================================
# Progress handling
# =============================================================================

init_progress() {
    local task="$1"

    ensure_dir ".agent"

    if [[ ! -f .agent/progress.txt ]]; then
        cat > .agent/progress.txt << EOF
# Chorus Progress Log
# Task: $task
# Started: $(date '+%Y-%m-%d %H:%M')

EOF
    fi
}

log_iteration() {
    local iteration="$1"
    local task="$2"

    cat >> .agent/progress.txt << EOF

=== Iteration $iteration ($(date '+%Y-%m-%d %H:%M')) ===
Task: $task

EOF
}

check_progress_status() {
    if [[ ! -f .agent/progress.txt ]]; then
        echo "not_started"
        return 0
    fi

    # Look for status markers on their own line (not in comments)
    # ^STATUS: DONE matches start of line
    if grep -q "^STATUS: DONE" .agent/progress.txt 2>/dev/null; then
        echo "done"
        return 0
    fi

    if grep -q "^STATUS: BLOCKED" .agent/progress.txt 2>/dev/null; then
        echo "blocked"
        return 0
    fi

    echo "in_progress"
}

# =============================================================================
# Agent execution
# =============================================================================

get_agent_command() {
    local agent="$1"
    local prompt_file="$2"

    case "$agent" in
        claude)
            echo "claude --dangerously-skip-permissions -p \"\$(cat $prompt_file)\""
            ;;
        codex)
            echo "codex --full-auto \"\$(cat $prompt_file)\""
            ;;
        opencode)
            echo "opencode -p \"\$(cat $prompt_file)\""
            ;;
        *)
            echo "claude --dangerously-skip-permissions -p \"\$(cat $prompt_file)\""
            ;;
    esac
}

run_agent() {
    local agent="$1"
    local prompt_file="$2"

    case "$agent" in
        claude)
            claude --dangerously-skip-permissions -p "$(cat "$prompt_file")"
            ;;
        codex)
            codex --full-auto "$(cat "$prompt_file")"
            ;;
        opencode)
            opencode -p "$(cat "$prompt_file")"
            ;;
        *)
            claude --dangerously-skip-permissions -p "$(cat "$prompt_file")"
            ;;
    esac
}

# =============================================================================
# Main
# =============================================================================

loop_main() {
    local task=""
    local task_id=""
    local criteria=""
    local agent="claude"
    local max_iterations=20
    local dry_run=false
    local quiet=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --quiet|-q)
                quiet=true
                shift
                ;;
            --agent)
                agent="$2"
                shift 2
                ;;
            --max-iterations)
                max_iterations="$2"
                shift 2
                ;;
            --task-id)
                task_id="$2"
                shift 2
                ;;
            --criteria)
                criteria="$2"
                shift 2
                ;;
            -h|--help)
                cat << EOF
Usage: chorus loop [options] "task description"

Run an autonomous loop until task completion (Ralph Wiggum pattern).

Options:
  --agent <name>        Agent to use: claude, codex, opencode (default: claude)
  --max-iterations <n>  Maximum iterations before stopping (default: 20)
  --task-id <id>        Beads task ID to reference (e.g., bd-a1b2)
  --criteria <text>     Custom completion criteria
  --dry-run             Show what would be executed without running
  --quiet, -q           Suppress output
  -h, --help            Show this help

Examples:
  chorus loop "Implement user authentication"
  chorus loop --agent codex --max-iterations 10 "Fix failing tests"
  chorus loop --task-id bd-a1b2 "Complete the task"
  chorus loop --criteria "All tests pass" "Add unit tests"
EOF
                return 0
                ;;
            -*)
                log_error "Unknown option: $1"
                return 1
                ;;
            *)
                if [[ -z "$task" ]]; then
                    task="$1"
                else
                    log_error "Unexpected argument: $1"
                    return 1
                fi
                shift
                ;;
        esac
    done

    # Validate task
    if [[ -z "$task" ]]; then
        log_error "No task specified"
        echo ""
        echo "Usage: chorus loop [options] \"task description\""
        echo "Run 'chorus loop --help' for more information."
        return 1
    fi

    # Check existing progress
    local status
    status=$(check_progress_status)

    if [[ "$status" == "done" ]]; then
        if [[ "$quiet" != true ]]; then
            log_success "Task already complete (STATUS: DONE found in progress.txt)"
        fi
        return 0
    fi

    if [[ "$status" == "blocked" ]]; then
        log_error "Task is blocked (STATUS: BLOCKED found in progress.txt)"
        echo "Check .agent/progress.txt for details."
        return 1
    fi

    # Initialize
    init_progress "$task"
    generate_prompt "$task" "$task_id" "$criteria"

    if [[ "$quiet" != true ]]; then
        echo "Chorus Loop"
        echo "==========="
        echo "task: $task"
        echo "agent: $agent"
        echo "max-iterations: $max_iterations"
        if [[ -n "$task_id" ]]; then
            echo "task-id: $task_id"
        fi
        echo ""
    fi

    # Dry run mode
    if [[ "$dry_run" == true ]]; then
        if [[ "$quiet" != true ]]; then
            echo "[DRY RUN] Would execute:"
            echo "  $(get_agent_command "$agent" ".agent/PROMPT.md")"
            echo ""
            echo "Iteration 1 of $max_iterations"
            echo ""
            echo "Generated prompt saved to: .agent/PROMPT.md"
        fi
        log_iteration 1 "$task"
        return 0
    fi

    # Run loop
    local iteration=0
    while [[ $iteration -lt $max_iterations ]]; do
        ((iteration++))

        if [[ "$quiet" != true ]]; then
            echo "--- Iteration $iteration of $max_iterations ---"
        fi

        log_iteration "$iteration" "$task"

        # Run agent
        if ! run_agent "$agent" ".agent/PROMPT.md"; then
            log_warn "Agent exited with error"
        fi

        # Check if done
        status=$(check_progress_status)

        if [[ "$status" == "done" ]]; then
            if [[ "$quiet" != true ]]; then
                echo ""
                log_success "Task completed after $iteration iterations"
            fi
            return 0
        fi

        if [[ "$status" == "blocked" ]]; then
            log_error "Task blocked after $iteration iterations"
            echo "Check .agent/progress.txt for details."
            return 1
        fi

        if [[ "$quiet" != true ]]; then
            echo ""
        fi
    done

    log_warn "Max iterations reached ($max_iterations)"
    echo "Task may not be complete. Check .agent/progress.txt"
    return 1
}
