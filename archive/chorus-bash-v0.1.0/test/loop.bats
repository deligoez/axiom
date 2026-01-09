#!/usr/bin/env bats
# Tests for chorus loop command

load 'test_helper/common-setup'

# =============================================================================
# Help and validation
# =============================================================================

@test "chorus loop --help shows usage" {
    run chorus loop --help
    assert_success
    assert_output --partial "Usage:"
    assert_output --partial "chorus loop"
}

@test "chorus loop without task shows error" {
    run chorus loop
    assert_failure
    assert_output --partial "task"
}

# =============================================================================
# Dry run mode (no actual agent execution)
# =============================================================================

@test "chorus loop --dry-run creates progress entry" {
    chorus init --non-interactive
    run chorus loop --dry-run "Test task"
    assert_success
    assert_file_exists ".agent/progress.txt"
    assert_file_contains ".agent/progress.txt" "Test task"
}

@test "chorus loop --dry-run creates PROMPT.md" {
    chorus init --non-interactive
    run chorus loop --dry-run "Implement feature X"
    assert_success
    assert_file_exists ".agent/PROMPT.md"
    assert_file_contains ".agent/PROMPT.md" "Implement feature X"
}

@test "chorus loop --dry-run respects --max-iterations" {
    chorus init --non-interactive
    run chorus loop --dry-run --max-iterations 5 "Test"
    assert_success
    assert_output --partial "max-iterations: 5"
}

@test "chorus loop --dry-run shows what would be executed" {
    chorus init --non-interactive
    run chorus loop --dry-run "Test task"
    assert_success
    assert_output --partial "DRY RUN"
    assert_output --partial "claude"
}

# =============================================================================
# Progress file handling
# =============================================================================

@test "chorus loop initializes progress file if missing" {
    mkdir -p .agent
    run chorus loop --dry-run "Test"
    assert_success
    assert_file_exists ".agent/progress.txt"
}

@test "chorus loop appends to existing progress file" {
    chorus init --non-interactive
    echo "# Previous content" >> .agent/progress.txt
    run chorus loop --dry-run "New task"
    assert_success
    assert_file_contains ".agent/progress.txt" "Previous content"
    assert_file_contains ".agent/progress.txt" "New task"
}

@test "chorus loop detects STATUS: DONE in progress" {
    mkdir -p .agent
    echo "STATUS: DONE" > .agent/progress.txt
    run chorus loop --dry-run "Test"
    assert_success
    assert_output --partial "already complete"
}

@test "chorus loop detects STATUS: BLOCKED in progress" {
    mkdir -p .agent
    echo "STATUS: BLOCKED" > .agent/progress.txt
    run chorus loop --dry-run "Test"
    assert_failure
    assert_output --partial "blocked"
}

# =============================================================================
# Agent selection
# =============================================================================

@test "chorus loop --agent claude uses claude" {
    chorus init --non-interactive
    run chorus loop --dry-run --agent claude "Test"
    assert_success
    assert_output --partial "agent: claude"
}

@test "chorus loop --agent codex uses codex" {
    chorus init --non-interactive
    run chorus loop --dry-run --agent codex "Test"
    assert_success
    assert_output --partial "agent: codex"
}

@test "chorus loop defaults to claude agent" {
    chorus init --non-interactive
    run chorus loop --dry-run "Test"
    assert_success
    assert_output --partial "agent: claude"
}

# =============================================================================
# Prompt generation
# =============================================================================

@test "chorus loop includes completion criteria in prompt" {
    chorus init --non-interactive
    run chorus loop --dry-run "Test task"
    assert_success
    assert_file_contains ".agent/PROMPT.md" "STATUS: DONE"
}

@test "chorus loop includes progress reference in prompt" {
    chorus init --non-interactive
    run chorus loop --dry-run "Test task"
    assert_success
    assert_file_contains ".agent/PROMPT.md" "progress.txt"
}

@test "chorus loop --criteria adds custom criteria" {
    chorus init --non-interactive
    run chorus loop --dry-run --criteria "All tests pass" "Test task"
    assert_success
    assert_file_contains ".agent/PROMPT.md" "All tests pass"
}

# =============================================================================
# Beads integration
# =============================================================================

@test "chorus loop --task-id includes beads task in prompt" {
    chorus init --non-interactive
    run chorus loop --dry-run --task-id "bd-a1b2" "Test task"
    assert_success
    assert_file_contains ".agent/PROMPT.md" "bd-a1b2"
}

# =============================================================================
# Output and logging
# =============================================================================

@test "chorus loop shows iteration count" {
    chorus init --non-interactive
    run chorus loop --dry-run --max-iterations 3 "Test"
    assert_success
    assert_output --partial "Iteration 1"
}

@test "chorus loop --quiet suppresses output" {
    chorus init --non-interactive
    run chorus loop --dry-run --quiet "Test"
    assert_success
    # Should have minimal output
    [ "${#output}" -lt 100 ]
}
