#!/usr/bin/env bash
# Common functions for Chorus CLI

# Colors (if terminal supports it)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Print colored message
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if in git repo
in_git_repo() {
    git rev-parse --is-inside-work-tree &> /dev/null
}

# Get git root directory
git_root() {
    git rev-parse --show-toplevel 2>/dev/null
}

# Safely append line to file if not exists
append_if_missing() {
    local file="$1"
    local line="$2"

    touch "$file"
    if ! grep -qxF "$line" "$file"; then
        echo "$line" >> "$file"
    fi
}

# Copy file if destination doesn't exist
copy_if_missing() {
    local src="$1"
    local dst="$2"

    if [[ ! -f "$dst" ]]; then
        cp "$src" "$dst"
        return 0
    fi
    return 1
}

# Ensure directory exists
ensure_dir() {
    mkdir -p "$1"
}
