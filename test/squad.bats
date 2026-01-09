#!/usr/bin/env bats
# Tests for chorus squad command

load 'test_helper/common-setup'

# =============================================================================
# Help and validation
# =============================================================================

@test "chorus squad --help shows usage" {
    run chorus squad --help
    assert_success
    assert_output --partial "Usage:"
    assert_output --partial "chorus squad"
}

@test "chorus squad requires git repo" {
    rm -rf .git
    run chorus squad --dry-run --agents claude
    assert_failure
    assert_output --partial "git"
}

# =============================================================================
# Worktree creation (dry run)
# =============================================================================

@test "chorus squad --dry-run shows worktree commands" {
    run chorus squad --dry-run --agents claude
    assert_success
    assert_output --partial "worktree"
    assert_output --partial "claude"
}

@test "chorus squad --dry-run with multiple agents" {
    run chorus squad --dry-run --agents claude,codex
    assert_success
    assert_output --partial "claude"
    assert_output --partial "codex"
}

@test "chorus squad creates .worktrees directory" {
    run chorus squad --dry-run --agents claude
    assert_success
    assert_output --partial ".worktrees"
}

# =============================================================================
# Agent validation
# =============================================================================

@test "chorus squad validates agent names" {
    run chorus squad --dry-run --agents claude,codex,opencode
    assert_success
}

@test "chorus squad rejects invalid agent names" {
    run chorus squad --dry-run --agents invalid-agent
    assert_failure
    assert_output --partial "Unknown agent"
}

@test "chorus squad requires at least one agent" {
    run chorus squad --dry-run
    assert_failure
    assert_output --partial "agent"
}

# =============================================================================
# Task assignment
# =============================================================================

@test "chorus squad --task assigns task to agents" {
    run chorus squad --dry-run --agents claude --task "Implement feature"
    assert_success
    assert_output --partial "Implement feature"
}

@test "chorus squad --task-id uses beads task" {
    run chorus squad --dry-run --agents claude --task-id bd-a1b2
    assert_success
    assert_output --partial "bd-a1b2"
}

# =============================================================================
# Branch naming
# =============================================================================

@test "chorus squad creates agent branches" {
    run chorus squad --dry-run --agents claude
    assert_success
    assert_output --partial "agent/claude"
}

@test "chorus squad uses task-id in branch name" {
    run chorus squad --dry-run --agents claude --task-id bd-a1b2
    assert_success
    assert_output --partial "agent/claude/bd-a1b2"
}

# =============================================================================
# Output modes
# =============================================================================

@test "chorus squad --quiet suppresses output" {
    run chorus squad --dry-run --quiet --agents claude
    assert_success
    [ "${#output}" -lt 100 ]
}

@test "chorus squad shows status for each agent" {
    run chorus squad --dry-run --agents claude,codex
    assert_success
    assert_output --partial "claude"
    assert_output --partial "codex"
}
