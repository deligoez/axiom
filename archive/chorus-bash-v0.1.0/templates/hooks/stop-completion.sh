#!/usr/bin/env bash
# Chorus Stop Hook
# Checks if task is actually complete before allowing exit

set -euo pipefail

PROGRESS_FILE=".agent/progress.txt"

# Read stdin (hook input)
input=$(cat)

# Parse stop reason from input (if available)
# stop_reason=$(echo "$input" | jq -r '.stop_reason // empty' 2>/dev/null || true)

# Check 1: Explicitly marked done
if [[ -f "$PROGRESS_FILE" ]] && grep -q "STATUS: DONE" "$PROGRESS_FILE" 2>/dev/null; then
    echo '{"result": "continue"}'
    exit 0
fi

# Check 2: Explicitly marked blocked (allow exit to report)
if [[ -f "$PROGRESS_FILE" ]] && grep -q "STATUS: BLOCKED" "$PROGRESS_FILE" 2>/dev/null; then
    echo '{"result": "continue"}'
    exit 0
fi

# Check 3: Tests pass (if test command exists)
if [[ -f package.json ]] && command -v npm &> /dev/null; then
    if npm test --silent 2>/dev/null; then
        echo '{"result": "continue"}'
        exit 0
    fi
fi

# Check 4: If using Beads, check if current task is closed
if command -v bd &> /dev/null && [[ -d .beads ]]; then
    # Get in-progress tasks
    in_progress=$(bd list --status=in-progress 2>/dev/null | wc -l || echo 0)
    if [[ "$in_progress" -eq 0 ]]; then
        # No tasks in progress = probably done
        echo '{"result": "continue"}'
        exit 0
    fi
fi

# Not done - provide guidance but allow exit
# (blocking can cause infinite loops in some cases)
cat << 'EOF'
{
  "result": "continue",
  "message": "Task may not be complete.\n\nTo mark complete:\n- Write 'STATUS: DONE' to .agent/progress.txt\n- Or ensure tests pass\n- Or close the Beads task with: bd close <id>"
}
EOF
