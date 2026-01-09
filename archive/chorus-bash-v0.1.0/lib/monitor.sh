#!/usr/bin/env bash
# chorus monitor - tmux-based multi-agent monitoring

CHORUS_SESSION="chorus-squad"

# =============================================================================
# tmux helpers
# =============================================================================

check_tmux() {
    if ! command_exists tmux; then
        log_error "tmux is required for monitoring"
        echo "Install with: brew install tmux"
        return 1
    fi
}

session_exists() {
    tmux has-session -t "$CHORUS_SESSION" 2>/dev/null
}

kill_session() {
    if session_exists; then
        tmux kill-session -t "$CHORUS_SESSION"
    fi
}

# =============================================================================
# Layout creation
# =============================================================================

create_monitor_session() {
    local -a agents=("$@")
    local agent_count=${#agents[@]}

    # Kill existing session if any
    kill_session

    # Create new session with first agent
    local first_agent="${agents[0]}"
    local first_worktree=".worktrees/$first_agent"

    tmux new-session -d -s "$CHORUS_SESSION" -n "monitor"

    # Set up the layout based on agent count
    case $agent_count in
        1)
            # Single agent: one pane + status bar
            # ┌─────────────────┐
            # │     Agent 1     │
            # ├─────────────────┤
            # │     Status      │
            # └─────────────────┘
            tmux split-window -v -p 15 -t "$CHORUS_SESSION"
            ;;
        2)
            # Two agents side by side + status bar
            # ┌────────┬────────┐
            # │ Agent1 │ Agent2 │
            # ├────────┴────────┤
            # │     Status      │
            # └─────────────────┘
            tmux split-window -h -t "$CHORUS_SESSION"
            tmux split-window -v -p 15 -t "$CHORUS_SESSION"
            ;;
        3|*)
            # Three+ agents in top row + status bar
            # ┌─────┬─────┬─────┐
            # │  A1 │  A2 │  A3 │
            # ├─────┴─────┴─────┤
            # │     Status      │
            # └─────────────────┘
            tmux split-window -h -t "$CHORUS_SESSION"
            if [[ $agent_count -ge 3 ]]; then
                tmux split-window -h -t "$CHORUS_SESSION:0.0"
            fi
            tmux split-window -v -p 15 -t "$CHORUS_SESSION"
            ;;
    esac

    # Set pane titles and return pane IDs
    tmux select-layout -t "$CHORUS_SESSION" tiled
}

setup_agent_pane() {
    local pane_id="$1"
    local agent="$2"
    local worktree="$3"
    local task="$4"
    local cmd

    cmd=$(get_agent_start_command "$agent" "$task")

    # Set pane title
    tmux select-pane -t "$CHORUS_SESSION:0.$pane_id" -T "$agent"

    # Send command to pane
    tmux send-keys -t "$CHORUS_SESSION:0.$pane_id" "cd $(pwd)/$worktree && echo '═══ $agent ═══' && $cmd" Enter
}

setup_status_pane() {
    local pane_id="$1"
    local -a agents=("${@:2}")

    # Create status watcher script
    cat > /tmp/chorus-status.sh << 'STATUSEOF'
#!/bin/bash
while true; do
    clear
    echo "═══════════════════════════════════════════════════════════════════════"
    echo "  CHORUS SQUAD MONITOR | $(date '+%H:%M:%S')"
    echo "═══════════════════════════════════════════════════════════════════════"
    echo ""

    for worktree in .worktrees/*/; do
        if [[ -d "$worktree" ]]; then
            agent=$(basename "$worktree")
            progress_file="$worktree/.agent/progress.txt"

            if [[ -f "$progress_file" ]]; then
                status=$(grep -E "^STATUS:" "$progress_file" | tail -1 | cut -d: -f2 | tr -d ' ')
                case "$status" in
                    DONE) icon="✓" ;;
                    BLOCKED) icon="✗" ;;
                    *) icon="●" ;;
                esac
            else
                icon="○"
                status="waiting"
            fi

            printf "  %s %-10s [%s]\n" "$icon" "$agent" "$status"
        fi
    done

    echo ""
    echo "───────────────────────────────────────────────────────────────────────"
    echo "  Ctrl+B D to detach | Ctrl+C to stop monitoring"
    echo "═══════════════════════════════════════════════════════════════════════"

    sleep 2
done
STATUSEOF
    chmod +x /tmp/chorus-status.sh

    # Run status in the last pane
    tmux send-keys -t "$CHORUS_SESSION:0.$pane_id" "cd $(pwd) && /tmp/chorus-status.sh" Enter
}

# =============================================================================
# Main monitor setup
# =============================================================================

start_monitor() {
    local task="$1"
    shift
    local -a agents=("$@")
    local agent_count=${#agents[@]}

    if ! check_tmux; then
        return 1
    fi

    echo "Starting monitor session..."

    # Create tmux session with layout
    create_monitor_session "${agents[@]}"

    # Calculate pane assignments
    # Panes are numbered 0, 1, 2... with status pane being the last one
    local status_pane=$agent_count

    # Setup each agent pane
    local pane_id=0
    for agent in "${agents[@]}"; do
        local worktree=".worktrees/$agent"
        setup_agent_pane "$pane_id" "$agent" "$worktree" "$task"
        ((pane_id++))
    done

    # Setup status pane
    setup_status_pane "$status_pane" "${agents[@]}"

    # Select first agent pane
    tmux select-pane -t "$CHORUS_SESSION:0.0"

    echo ""
    log_success "Monitor session created: $CHORUS_SESSION"
    echo ""
    echo "Attach with:"
    echo "  tmux attach -t $CHORUS_SESSION"
    echo ""
}

attach_monitor() {
    if ! session_exists; then
        log_error "No chorus session found"
        echo "Start with: chorus squad --agents <agents> --monitor"
        return 1
    fi

    tmux attach -t "$CHORUS_SESSION"
}
