#!/usr/bin/env bash
# chorus status - Show current state

status_main() {
    echo "Chorus Status"
    echo "============="
    echo ""

    # Check for .agent directory
    if [[ -d .agent ]]; then
        log_success ".agent/ exists"

        if [[ -f .agent/progress.txt ]]; then
            if grep -q "STATUS: DONE" .agent/progress.txt 2>/dev/null; then
                echo "  Progress: ✅ Complete"
            elif grep -q "STATUS: BLOCKED" .agent/progress.txt 2>/dev/null; then
                echo "  Progress: ⚠️  Blocked"
            elif grep -q "=== Iteration" .agent/progress.txt 2>/dev/null; then
                iter_count=$(grep -c "=== Iteration" .agent/progress.txt)
                echo "  Progress: ⏳ In progress ($iter_count iterations)"
            else
                echo "  Progress: Not started"
            fi
        fi

        if [[ -f .agent/learnings.md ]]; then
            learning_count=$(grep -c "^-" .agent/learnings.md 2>/dev/null || echo 0)
            echo "  Learnings: $learning_count entries"
        fi
    else
        log_warn ".agent/ not found - run 'chorus init'"
    fi

    echo ""

    # Check for Beads
    if [[ -d .beads ]]; then
        log_success ".beads/ exists"
        if command_exists bd; then
            ready_count=$(bd ready 2>/dev/null | wc -l || echo 0)
            echo "  Ready tasks: $ready_count"
        fi
    else
        echo "  .beads/ not found"
    fi

    echo ""

    # Check for hooks
    if [[ -d .claude/hooks ]]; then
        log_success ".claude/hooks/ exists"
        hook_count=$(ls .claude/hooks/*.sh 2>/dev/null | wc -l || echo 0)
        echo "  Hooks: $hook_count"
    else
        echo "  .claude/hooks/ not found"
    fi

    echo ""

    # Check for worktrees
    if [[ -d .worktrees ]]; then
        worktree_count=$(ls -d .worktrees/*/ 2>/dev/null | wc -l || echo 0)
        log_success ".worktrees/ exists ($worktree_count active)"
    fi
}
