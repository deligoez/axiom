# Chorus

**Multi-Agent Development Workflow**

Chorus is a workflow system for coordinating multiple AI coding agents (Claude Code, Codex CLI, OpenCode) on a single project.

## What is Chorus?

Chorus provides:

- **Agent coordination** - Route tasks to the right AI agent based on complexity
- **Parallel work** - Run multiple agents simultaneously using git worktrees
- **Shared memory** - Learnings persist across sessions and agents
- **Task management** - Track work with Beads, an agent-native task system
- **Cost optimization** - Use expensive models only when needed

## Quick Start

### 1. Copy workflow files to your project

```bash
# Clone chorus
git clone https://github.com/deligoez/chorus.git

# Copy to your project
cp chorus/WORKFLOW.md your-project/
cp chorus/AGENTS.md.template your-project/AGENTS.md
mkdir -p your-project/.agent
echo "# Project Learnings" > your-project/.agent/learnings.md
```

### 2. Edit AGENTS.md for your project

Fill in your project's tech stack, conventions, and instructions.

### 3. Initialize Beads

```bash
cd your-project
npm install -g beads-cli
bd init
```

### 4. Create your first task

```bash
bd create "Setup: Verify workflow works" -p 1 -l setup
bd ready  # Should show your task
```

### 5. Start working

```bash
claude --dangerously-skip-permissions
# or
codex --full-auto
```

## Project Structure

```
chorus/
├── WORKFLOW.md           # Complete workflow documentation
├── AGENTS.md.template    # Template for project instructions
├── vps-setup/            # Scripts for VPS deployment
│   ├── bootstrap.sh      # Main setup script
│   ├── test-setup.sh     # Verification script
│   ├── README.md         # Detailed VPS guide
│   └── QUICKSTART.md     # Quick reference
├── .agent/               # Memory system
│   └── learnings.md      # Shared knowledge (append-only)
├── thoughts/ledgers/     # Continuity ledgers
└── examples/             # Example configurations
```

## Agent Fleet

| Agent | Best For | Cost |
|-------|----------|------|
| **Claude (Opus)** | Architecture, hard problems | $$$$ |
| **Codex (GPT-5.2)** | Debugging, features | $$ |
| **GLM-4.7** | Tests, docs, simple fixes | $ |

## Key Concepts

### Two-Layer Task System

1. **Beads** - Active tasks (10-15 immediate items with details)
2. **Roadmap** - Future work (high-level phases in your spec)

### Memory System

- **scratchpad.md** - Per-session notes (volatile)
- **learnings.md** - Permanent knowledge (append-only, shared)

### Parallel Work with Worktrees

```bash
# Create isolated workspace per agent
git worktree add .worktrees/claude -b agent/claude/task-1
git worktree add .worktrees/codex -b agent/codex/task-2

# Merge when done
git merge agent/claude/task-1
```

## VPS Deployment

For running agents on a remote server:

```bash
# On fresh Hetzner Ubuntu 24.04
curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/vps-setup/bootstrap.sh | bash
```

See [vps-setup/README.md](vps-setup/README.md) for details.

## Documentation

- [WORKFLOW.md](WORKFLOW.md) - Complete workflow documentation
- [vps-setup/README.md](vps-setup/README.md) - VPS setup guide
- [vps-setup/QUICKSTART.md](vps-setup/QUICKSTART.md) - Quick reference

## Tools Used

- [Beads](https://github.com/steveyegge/beads) - Agent-native task management
- [Claude Squad](https://github.com/smtg-ai/claude-squad) - Multi-agent orchestration
- [Git Worktrees](https://git-scm.com/docs/git-worktree) - Parallel workspaces

## License

MIT
