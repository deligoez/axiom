#!/bin/bash
# Chorus VPS Bootstrap Script
# Run on fresh Hetzner Ubuntu 24.04 VPS
# Usage: curl -fsSL <raw-url> | bash

set -e

echo "=========================================="
echo "  Chorus VPS Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    error "Don't run as root. Run as regular user with sudo access."
fi

# 1. System updates
echo ""
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
log "Installing dependencies..."
sudo apt install -y \
    git \
    curl \
    wget \
    tmux \
    htop \
    jq \
    unzip \
    build-essential

# 3. Install Node.js 22 LTS
log "Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version

# 4. Install Claude Code
log "Installing Claude Code..."
curl -fsSL https://claude.ai/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# 5. Install Codex CLI
log "Installing Codex CLI..."
npm install -g @openai/codex

# 6. Install Beads (task management)
log "Installing Beads..."
npm install -g beads-cli || warn "Beads install failed - may need manual install"

# 7. Install Chorus CLI
log "Installing Chorus CLI..."
curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/install.sh | bash

# 8. Create workspace directory
log "Creating workspace..."
mkdir -p ~/workspace
mkdir -p ~/workspace/.worktrees

# 9. Setup tmux config
log "Configuring tmux..."
cat > ~/.tmux.conf << 'EOF'
# Chorus tmux config
set -g mouse on
set -g history-limit 50000
set -g default-terminal "screen-256color"

# Status bar
set -g status-style bg=colour235,fg=colour136
set -g status-left '#[fg=green]#S '
set -g status-right '#[fg=yellow]%H:%M '

# Window colors
setw -g window-status-current-style fg=colour166,bold

# Pane borders
set -g pane-border-style fg=colour235
set -g pane-active-border-style fg=colour136

# Easy split
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# Easy navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
EOF

# 10. Create environment template
log "Creating environment template..."
cat > ~/workspace/.env.template << 'EOF'
# Chorus Environment Variables
# Copy to .env and fill in your values

# Anthropic (Claude Code)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# OpenAI (Codex CLI)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# GitHub (for pushing changes)
# Get from: https://github.com/settings/tokens
GITHUB_TOKEN=
EOF

# 11. Create session startup script
log "Creating session startup script..."
cat > ~/workspace/start-agents.sh << 'EOF'
#!/bin/bash
# Start multi-agent tmux session

SESSION="chorus"

# Kill existing session if exists
tmux kill-session -t $SESSION 2>/dev/null

# Create new session
tmux new-session -d -s $SESSION -n main

# Window 1: Claude agent
tmux new-window -t $SESSION:1 -n claude
tmux send-keys -t $SESSION:1 'cd ~/workspace && echo "Claude agent ready. Run: claude"' Enter

# Window 2: Codex agent
tmux new-window -t $SESSION:2 -n codex
tmux send-keys -t $SESSION:2 'cd ~/workspace && echo "Codex agent ready. Run: codex"' Enter

# Window 3: Monitoring
tmux new-window -t $SESSION:3 -n monitor
tmux send-keys -t $SESSION:3 'htop' Enter

# Go back to main window
tmux select-window -t $SESSION:0
tmux send-keys -t $SESSION:0 'cd ~/workspace && echo "Session ready. Use Ctrl+b then number to switch windows."' Enter

echo "Session '$SESSION' created. Attach with: tmux attach -t $SESSION"
EOF
chmod +x ~/workspace/start-agents.sh

# 12. Summary
echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
log "Installed:"
echo "    - Node.js $(node --version)"
echo "    - Claude Code $(claude --version 2>/dev/null || echo 'needs auth')"
echo "    - Codex CLI $(codex --version 2>/dev/null || echo 'installed')"
echo "    - Chorus CLI $(chorus --version 2>/dev/null || echo 'installed')"
echo "    - tmux, git, htop, jq"
echo ""
warn "Next steps:"
echo "    1. Copy .env.template to .env and add API keys"
echo "    2. Run: source ~/.bashrc"
echo "    3. Run: claude auth login"
echo "    4. Clone your project to ~/workspace/"
echo "    5. Run: cd ~/workspace/your-project && chorus init --all"
echo "    6. Run: ~/workspace/start-agents.sh"
echo ""
echo "Quick start:"
echo "    chorus init --all      # Initialize project"
echo "    chorus loop \"task\"     # Run autonomous loop"
echo "    chorus squad --agents claude,codex  # Start multi-agent"
echo ""
echo "Attach to session: tmux attach -t chorus"
echo "=========================================="
