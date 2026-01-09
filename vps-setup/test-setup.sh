#!/bin/bash
# Chorus VPS Setup Verification
# Run after bootstrap to verify everything works

set -e

echo "=========================================="
echo "  Chorus Setup Verification"
echo "=========================================="
echo ""

PASS=0
FAIL=0

check() {
    if $2 > /dev/null 2>&1; then
        echo -e "[\033[0;32m✓\033[0m] $1"
        ((PASS++))
    else
        echo -e "[\033[0;31m✗\033[0m] $1"
        ((FAIL++))
    fi
}

check_env() {
    if [ -n "${!1}" ]; then
        echo -e "[\033[0;32m✓\033[0m] $1 is set"
        ((PASS++))
    else
        echo -e "[\033[0;33m!\033[0m] $1 not set (optional: $2)"
    fi
}

echo "=== System Tools ==="
check "git installed" "git --version"
check "node installed" "node --version"
check "npm installed" "npm --version"
check "tmux installed" "tmux -V"
check "jq installed" "jq --version"

echo ""
echo "=== AI Agents ==="
check "Claude Code installed" "claude --version"
check "Codex CLI installed" "codex --version"

echo ""
echo "=== Task Management ==="
check "Beads installed" "bd --version"

echo ""
echo "=== Environment Variables ==="
check_env "ANTHROPIC_API_KEY" "needed for Claude API mode"
check_env "OPENAI_API_KEY" "needed for Codex"
check_env "GITHUB_TOKEN" "optional, can use SSH instead"

echo ""
echo "=== Directories ==="
check "workspace exists" "test -d ~/workspace"
check "worktrees dir exists" "test -d ~/workspace/.worktrees"

echo ""
echo "=== Claude Auth ==="
if claude auth status 2>&1 | grep -q "Logged in"; then
    echo -e "[\033[0;32m✓\033[0m] Claude authenticated"
    ((PASS++))
else
    echo -e "[\033[0;33m!\033[0m] Claude not authenticated (run: claude auth login)"
fi

echo ""
echo "=== Git Config ==="
if git config user.email > /dev/null 2>&1; then
    echo -e "[\033[0;32m✓\033[0m] Git email: $(git config user.email)"
    ((PASS++))
else
    echo -e "[\033[0;33m!\033[0m] Git email not set (run: git config --global user.email 'you@example.com')"
fi

if git config user.name > /dev/null 2>&1; then
    echo -e "[\033[0;32m✓\033[0m] Git name: $(git config user.name)"
    ((PASS++))
else
    echo -e "[\033[0;33m!\033[0m] Git name not set (run: git config --global user.name 'Your Name')"
fi

echo ""
echo "=== SSH Keys ==="
if [ -f ~/.ssh/id_ed25519 ] || [ -f ~/.ssh/id_rsa ]; then
    echo -e "[\033[0;32m✓\033[0m] SSH key exists"
    ((PASS++))
else
    echo -e "[\033[0;33m!\033[0m] No SSH key (run: ssh-keygen -t ed25519)"
fi

echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "\033[0;32mAll critical checks passed!\033[0m"
    echo ""
    echo "Next steps:"
    echo "  1. Clone repos: cd ~/workspace && git clone ..."
    echo "  2. Start session: ~/workspace/start-agents.sh"
    echo "  3. Attach: tmux attach -t chorus"
else
    echo ""
    echo -e "\033[0;31mSome checks failed. Please fix before continuing.\033[0m"
    exit 1
fi
