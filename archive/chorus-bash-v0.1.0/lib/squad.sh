#!/usr/bin/env bash
# chorus squad - Start multiple agents in parallel using git worktrees

# Valid agent names
VALID_AGENTS=("claude" "codex" "opencode")

# =============================================================================
# Validation
# =============================================================================

validate_agent() {
    local agent="$1"
    for valid in "${VALID_AGENTS[@]}"; do
        if [[ "$agent" == "$valid" ]]; then
            return 0
        fi
    done
    return 1
}

validate_agents() {
    local agents_str="$1"
    IFS=',' read -ra agents <<< "$agents_str"

    for agent in "${agents[@]}"; do
        if ! validate_agent "$agent"; then
            log_error "Unknown agent: $agent"
            echo "Valid agents: ${VALID_AGENTS[*]}"
            return 1
        fi
    done
    return 0
}

# =============================================================================
# Git operations
# =============================================================================

check_git_repo() {
    if ! in_git_repo; then
        log_error "Not in a git repository"
        echo "Run this command from within a git repository."
        return 1
    fi
}

get_branch_name() {
    local agent="$1"
    local task_id="$2"

    if [[ -n "$task_id" ]]; then
        echo "agent/$agent/$task_id"
    else
        echo "agent/$agent/$(date +%Y%m%d-%H%M%S)"
    fi
}

create_worktree() {
    local agent="$1"
    local branch="$2"
    local worktree_path=".worktrees/$agent"

    # Create worktrees directory
    mkdir -p .worktrees

    # Create worktree
    git worktree add "$worktree_path" -b "$branch" 2>/dev/null || {
        # Branch might already exist
        git worktree add "$worktree_path" "$branch" 2>/dev/null || {
            log_error "Failed to create worktree for $agent"
            return 1
        }
    }

    log_success "Created worktree: $worktree_path (branch: $branch)"
}

# =============================================================================
# Agent commands
# =============================================================================

get_agent_start_command() {
    local agent="$1"
    local task="$2"

    case "$agent" in
        claude)
            if [[ -n "$task" ]]; then
                echo "claude --dangerously-skip-permissions -p \"$task\""
            else
                echo "claude --dangerously-skip-permissions"
            fi
            ;;
        codex)
            if [[ -n "$task" ]]; then
                echo "codex --full-auto \"$task\""
            else
                echo "codex --full-auto"
            fi
            ;;
        opencode)
            if [[ -n "$task" ]]; then
                echo "opencode -p \"$task\""
            else
                echo "opencode"
            fi
            ;;
    esac
}

start_agent() {
    local agent="$1"
    local worktree_path="$2"
    local task="$3"
    local cmd

    cmd=$(get_agent_start_command "$agent" "$task")

    # Start in new terminal/tmux if available
    if command_exists tmux; then
        tmux new-window -n "$agent" "cd $worktree_path && $cmd"
    else
        echo "Start manually: cd $worktree_path && $cmd"
    fi
}

# =============================================================================
# Main
# =============================================================================

squad_main() {
    local agents_str=""
    local task=""
    local task_id=""
    local dry_run=false
    local quiet=false
    local monitor=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agents)
                agents_str="$2"
                shift 2
                ;;
            --task)
                task="$2"
                shift 2
                ;;
            --task-id)
                task_id="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --monitor|-m)
                monitor=true
                shift
                ;;
            --quiet|-q)
                quiet=true
                shift
                ;;
            -h|--help)
                cat << EOF
Usage: chorus squad [options]

Start multiple agents in parallel using git worktrees.

Options:
  --agents <list>       Comma-separated list of agents (required)
                        Valid: claude, codex, opencode
  --task <description>  Task for all agents to work on
  --task-id <id>        Beads task ID (used in branch naming)
  --monitor, -m         Launch tmux dashboard to watch all agents
  --dry-run             Show what would be executed without running
  --quiet, -q           Suppress output
  -h, --help            Show this help

Examples:
  chorus squad --agents claude,codex --monitor
  chorus squad --agents claude --task "Implement auth" -m
  chorus squad --agents claude,codex --task-id bd-a1b2

Each agent runs in its own git worktree with an isolated branch.
Use --monitor for a tmux dashboard showing all agents side-by-side.
EOF
                return 0
                ;;
            *)
                log_error "Unknown option: $1"
                return 1
                ;;
        esac
    done

    # Validate
    if [[ -z "$agents_str" ]]; then
        log_error "No agents specified"
        echo "Use --agents to specify agents (e.g., --agents claude,codex)"
        return 1
    fi

    if ! validate_agents "$agents_str"; then
        return 1
    fi

    if ! check_git_repo; then
        return 1
    fi

    # Parse agents
    IFS=',' read -ra agents <<< "$agents_str"

    if [[ "$quiet" != true ]]; then
        echo "Chorus Squad"
        echo "============"
        echo "agents: ${agents[*]}"
        if [[ -n "$task" ]]; then
            echo "task: $task"
        fi
        if [[ -n "$task_id" ]]; then
            echo "task-id: $task_id"
        fi
        echo ""
    fi

    # Process each agent
    for agent in "${agents[@]}"; do
        local branch
        branch=$(get_branch_name "$agent" "$task_id")
        local worktree_path=".worktrees/$agent"

        if [[ "$dry_run" == true ]]; then
            if [[ "$quiet" != true ]]; then
                echo "[DRY RUN] Agent: $agent"
                echo "  Branch: $branch"
                echo "  Worktree: $worktree_path"
                echo "  Command: git worktree add $worktree_path -b $branch"
                echo "  Start: $(get_agent_start_command "$agent" "$task")"
                echo ""
            fi
        else
            if [[ "$quiet" != true ]]; then
                echo "Setting up $agent..."
            fi

            if ! create_worktree "$agent" "$branch"; then
                continue
            fi

            # Copy .agent directory to worktree
            if [[ -d .agent ]]; then
                cp -r .agent "$worktree_path/"
            fi

            # Start agent
            start_agent "$agent" "$worktree_path" "$task"
        fi
    done

    if [[ "$dry_run" != true ]] && [[ "$quiet" != true ]]; then
        # If monitor mode, use tmux dashboard
        if [[ "$monitor" == true ]]; then
            # Source monitor module
            source "$CHORUS_ROOT/lib/monitor.sh"

            # Start the monitor session
            start_monitor "$task" "${agents[@]}"

            echo "When done, merge branches:"
            for agent in "${agents[@]}"; do
                local branch
                branch=$(get_branch_name "$agent" "$task_id")
                echo "  git merge $branch"
            done
        else
            echo ""
            echo "Agents started. Monitor with:"
            echo "  git worktree list"
            echo "  tmux list-windows (if using tmux)"
            echo ""
            echo "When done, merge branches:"
            for agent in "${agents[@]}"; do
                local branch
                branch=$(get_branch_name "$agent" "$task_id")
                echo "  git merge $branch"
            done
        fi
    fi
}
