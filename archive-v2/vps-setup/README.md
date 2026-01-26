# Chorus VPS Setup Guide

Multi-agent workflow setup on Hetzner VPS.

## Creating Hetzner VPS

### 1. Server Specs (Recommended)

| Spec | Minimum | Recommended |
|------|---------|-------------|
| **Plan** | CX22 | CX32 |
| **vCPU** | 2 | 4 |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 40 GB | 80 GB |
| **Price** | €4.5/mo | €8.5/mo |
| **Location** | Falkenstein (DE) | Falkenstein (DE) |

### 2. Hetzner Cloud Console

1. Go to https://console.hetzner.cloud/
2. Click "Add Server"
3. Settings:
   - **Location:** Falkenstein (cheapest)
   - **Image:** Ubuntu 24.04
   - **Type:** CX22 (sufficient for starting)
   - **SSH Key:** Add your local SSH key
   - **Name:** `chorus-agents`

### 3. Adding SSH Key

```bash
# Copy your local SSH key
cat ~/.ssh/id_ed25519.pub

# In Hetzner console: "SSH Keys" > "Add SSH Key"
# Paste and save
```

## Connecting to VPS

```bash
# Get IP address from Hetzner console
ssh root@<VPS_IP>

# Create user on first connection (don't use root)
adduser chorus
usermod -aG sudo chorus

# Copy SSH key to new user
mkdir -p /home/chorus/.ssh
cp ~/.ssh/authorized_keys /home/chorus/.ssh/
chown -R chorus:chorus /home/chorus/.ssh
chmod 700 /home/chorus/.ssh
chmod 600 /home/chorus/.ssh/authorized_keys

# Exit and connect as new user
exit
ssh chorus@<VPS_IP>
```

## Running Bootstrap Script

```bash
# Run on VPS
curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/vps-setup/bootstrap.sh | bash
```

Or manually:

```bash
# Download script
wget https://raw.githubusercontent.com/deligoez/chorus/main/vps-setup/bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh
```

## API Key Setup

### Anthropic (Claude Code)

```bash
# Option 1: Browser auth (recommended)
claude auth login
# Login in browser, token saved automatically

# Option 2: API key
export ANTHROPIC_API_KEY="sk-ant-..."
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
```

### OpenAI (Codex CLI)

```bash
export OPENAI_API_KEY="sk-..."
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
```

### GitHub

```bash
# Create SSH key (on VPS)
ssh-keygen -t ed25519 -C "chorus-vps"

# Add public key to GitHub
cat ~/.ssh/id_ed25519.pub
# GitHub > Settings > SSH Keys > New SSH Key

# Test
ssh -T git@github.com
```

## Clone Your Repos

```bash
cd ~/workspace

# Clone your project
git clone git@github.com:your-org/your-project.git

# Initialize Beads
cd your-project
bd init
```

## Starting Agent Session

```bash
# Start tmux session
~/workspace/start-agents.sh

# Attach to session
tmux attach -t chorus

# Tmux shortcuts:
# Ctrl+b 0  → main window
# Ctrl+b 1  → claude window
# Ctrl+b 2  → codex window
# Ctrl+b 3  → monitor window
# Ctrl+b d  → detach (session keeps running in background)
```

## Worktree Setup (Parallel Agents)

```bash
cd ~/workspace/your-project

# Worktree for Agent 1
git worktree add ../.worktrees/project-agent1 -b agent/1/task-a

# Worktree for Agent 2
git worktree add ../.worktrees/project-agent2 -b agent/2/task-b

# Each agent works in its own worktree
# Tmux window 1: cd ~/workspace/.worktrees/project-agent1 && claude
# Tmux window 2: cd ~/workspace/.worktrees/project-agent2 && codex
```

## Daily Workflow

```bash
# 1. Connect to VPS
ssh chorus@<VPS_IP>

# 2. Attach to session (if already running)
tmux attach -t chorus

# 3. Or start new session
~/workspace/start-agents.sh
tmux attach -t chorus

# 4. Switch to Claude window (Ctrl+b 1)
# 5. Start working
claude -p "..." --dangerously-skip-permissions

# 6. Detach when done (Ctrl+b d)
# Session continues running in background
```

## Monitoring

```bash
# Resource usage
htop

# Claude Code logs
tail -f ~/.claude/logs/*.log

# Disk usage
df -h

# Running processes
ps aux | grep -E 'claude|codex|node'
```

## Backup & Sync

```bash
# Sync to local (rsync)
rsync -avz chorus@<VPS_IP>:~/workspace/ ~/vps-backup/

# Git push (after each task)
git add . && git commit -m "task complete" && git push
```

## Troubleshooting

### Claude auth issue
```bash
claude auth logout
claude auth login
```

### Codex API error
```bash
echo $OPENAI_API_KEY  # Check if set
codex --version       # Is CLI working
```

### tmux session lost
```bash
tmux ls                    # Check if exists
tmux attach -t chorus      # Attach
~/workspace/start-agents.sh  # Or restart
```

### Disk full
```bash
df -h
sudo apt autoremove
rm -rf ~/.npm/_cacache
```
