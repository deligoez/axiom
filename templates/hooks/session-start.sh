#!/usr/bin/env bash
# Chorus Session Start Hook
# Loads context at the beginning of each session

set -euo pipefail

# Find continuity ledger
LEDGER=$(find thoughts/ledgers -name "CONTINUITY_*.md" 2>/dev/null | head -1 || true)

output=""

if [[ -n "$LEDGER" ]]; then
    output+="📖 Ledger: $LEDGER\n"

    # Check for current task marker
    if grep -q '\[→\]' "$LEDGER" 2>/dev/null; then
        current=$(grep '\[→\]' "$LEDGER" | head -1 | sed 's/.*\[→\]//' | xargs)
        output+="   Current: $current\n"
    fi
fi

if [[ -f .agent/learnings.md ]]; then
    learning_count=$(grep -c "^-" .agent/learnings.md 2>/dev/null || echo 0)
    output+="📚 Learnings: $learning_count entries\n"
fi

if [[ -f .agent/progress.txt ]]; then
    if grep -q "STATUS: DONE" .agent/progress.txt 2>/dev/null; then
        output+="✅ Previous task: completed\n"
    elif grep -q "STATUS: BLOCKED" .agent/progress.txt 2>/dev/null; then
        output+="⚠️  Previous task: blocked\n"
    elif grep -q "=== Iteration" .agent/progress.txt 2>/dev/null; then
        iter_count=$(grep -c "=== Iteration" .agent/progress.txt)
        output+="⏳ Task in progress ($iter_count iterations)\n"
    fi
fi

if [[ -f .beads/issues.jsonl ]]; then
    task_count=$(wc -l < .beads/issues.jsonl | tr -d ' ')
    output+="📋 Beads tasks: $task_count\n"
fi

# Output JSON response
if [[ -n "$output" ]]; then
    # Escape for JSON
    message=$(echo -e "$output" | sed 's/"/\\"/g' | tr '\n' ' ')
    echo "{\"result\": \"continue\", \"message\": \"$message\"}"
else
    echo '{"result": "continue"}'
fi
