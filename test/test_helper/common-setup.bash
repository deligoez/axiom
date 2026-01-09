#!/usr/bin/env bash
# Common test setup for all bats tests

# Get the directory of this file
TEST_HELPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load bats helpers using absolute paths
load "$TEST_HELPER_DIR/bats-support/load"
load "$TEST_HELPER_DIR/bats-assert/load"
load "$TEST_HELPER_DIR/bats-file/load"

# Get the directory containing the chorus CLI
CHORUS_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
export PATH="$CHORUS_ROOT/bin:$PATH"

# Create temp directory for each test
setup() {
    TEST_TEMP_DIR="$(mktemp -d)"
    cd "$TEST_TEMP_DIR" || exit 1

    # Initialize git repo (many tests need this)
    git init --quiet
    git config user.email "test@example.com"
    git config user.name "Test User"
}

teardown() {
    cd /
    rm -rf "$TEST_TEMP_DIR"
}

# Helper: assert file contains text
assert_file_contains() {
    local file="$1"
    local text="$2"
    assert_file_exists "$file"
    run grep -q "$text" "$file"
    assert_success
}

# Helper: assert file does not contain text
assert_file_not_contains() {
    local file="$1"
    local text="$2"
    assert_file_exists "$file"
    run grep -q "$text" "$file"
    assert_failure
}

# Helper: count lines in file
count_lines() {
    wc -l < "$1" | tr -d ' '
}

# Helper: create minimal project structure
create_test_project() {
    mkdir -p src
    echo "console.log('hello');" > src/index.js
    echo '{"name": "test-project"}' > package.json
}
