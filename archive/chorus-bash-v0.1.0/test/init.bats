#!/usr/bin/env bats
# Tests for chorus init command

load 'test_helper/common-setup'

# =============================================================================
# Basic functionality
# =============================================================================

@test "chorus init creates .agent directory" {
    run chorus init --non-interactive
    assert_success
    assert_dir_exists ".agent"
}

@test "chorus init creates learnings.md" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists ".agent/learnings.md"
}

@test "chorus init creates progress.txt" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists ".agent/progress.txt"
}

@test "chorus init creates AGENTS.md" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists "AGENTS.md"
}

@test "chorus init creates scripts directory" {
    run chorus init --non-interactive
    assert_success
    assert_dir_exists "scripts"
    assert_file_exists "scripts/chorus-loop.sh"
    assert_file_executable "scripts/chorus-loop.sh"
}

# =============================================================================
# .gitignore handling
# =============================================================================

@test "chorus init creates .gitignore if missing" {
    run chorus init --non-interactive
    assert_success
    assert_file_exists ".gitignore"
}

@test "chorus init updates existing .gitignore" {
    echo "# existing content" > .gitignore
    run chorus init --non-interactive
    assert_success
    assert_file_contains ".gitignore" "# existing content"
    assert_file_contains ".gitignore" ".agent/scratchpad.md"
}

@test "chorus init adds required entries to .gitignore" {
    run chorus init --non-interactive
    assert_success
    assert_file_contains ".gitignore" ".agent/scratchpad.md"
    assert_file_contains ".gitignore" ".worktrees/"
    assert_file_contains ".gitignore" ".beads/beads.db"
}

@test "chorus init does not duplicate .gitignore entries" {
    echo ".agent/scratchpad.md" > .gitignore
    run chorus init --non-interactive
    assert_success

    # Count occurrences - should be exactly 1
    local count
    count=$(grep -c ".agent/scratchpad.md" .gitignore)
    [ "$count" -eq 1 ]
}

# =============================================================================
# Idempotency
# =============================================================================

@test "chorus init is idempotent" {
    run chorus init --non-interactive
    assert_success

    # Capture file state
    local learnings_before
    learnings_before=$(cat .agent/learnings.md)

    # Run again
    run chorus init --non-interactive
    assert_success

    # Files should not be overwritten
    local learnings_after
    learnings_after=$(cat .agent/learnings.md)
    [ "$learnings_before" = "$learnings_after" ]
}

@test "chorus init does not overwrite existing AGENTS.md" {
    echo "# Custom AGENTS.md" > AGENTS.md
    run chorus init --non-interactive
    assert_success
    assert_file_contains "AGENTS.md" "# Custom AGENTS.md"
}

# =============================================================================
# --with-hooks option
# =============================================================================

@test "chorus init --with-hooks creates hooks directory" {
    run chorus init --non-interactive --with-hooks
    assert_success
    assert_dir_exists ".claude/hooks"
}

@test "chorus init --with-hooks creates session-start hook" {
    run chorus init --non-interactive --with-hooks
    assert_success
    assert_file_exists ".claude/hooks/session-start.sh"
    assert_file_executable ".claude/hooks/session-start.sh"
}

@test "chorus init --with-hooks creates stop-completion hook" {
    run chorus init --non-interactive --with-hooks
    assert_success
    assert_file_exists ".claude/hooks/stop-completion.sh"
    assert_file_executable ".claude/hooks/stop-completion.sh"
}

@test "chorus init --with-hooks creates settings.json" {
    run chorus init --non-interactive --with-hooks
    assert_success
    assert_file_exists ".claude/settings.json"
    assert_file_contains ".claude/settings.json" "SessionStart"
    assert_file_contains ".claude/settings.json" "Stop"
}

# =============================================================================
# --all option
# =============================================================================

@test "chorus init --all enables all options" {
    run chorus init --non-interactive --all
    assert_success
    assert_dir_exists ".agent"
    assert_dir_exists ".claude/hooks"
    assert_file_exists "AGENTS.md"
}

# =============================================================================
# Output messages
# =============================================================================

@test "chorus init shows success message" {
    run chorus init --non-interactive
    assert_success
    assert_output --partial "Initializing Chorus"
    assert_output --partial ".agent/"
    assert_output --partial "Done!"
}

@test "chorus init shows next steps" {
    run chorus init --non-interactive
    assert_success
    assert_output --partial "Next steps"
    assert_output --partial "AGENTS.md"
}

# =============================================================================
# Edge cases
# =============================================================================

@test "chorus init works in empty directory" {
    # Already in empty temp dir from setup
    run chorus init --non-interactive
    assert_success
}

@test "chorus init works in directory with existing files" {
    create_test_project
    run chorus init --non-interactive
    assert_success
    # Original files should still exist
    assert_file_exists "src/index.js"
    assert_file_exists "package.json"
}
