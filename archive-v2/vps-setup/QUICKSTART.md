# Hetzner VPS Quick Start

## 1. Create Server on Hetzner (5 min)

```
console.hetzner.cloud → Add Server
├── Location: Falkenstein
├── Image: Ubuntu 24.04
├── Type: CX22 (€4.5/mo)
├── SSH Key: Paste contents of ~/.ssh/id_ed25519.pub
└── Name: chorus-agents
```

## 2. First Connection (2 min)

```bash
# Connect as root
ssh root@<IP>

# Create user
adduser chorus
usermod -aG sudo chorus
mkdir -p /home/chorus/.ssh
cp ~/.ssh/authorized_keys /home/chorus/.ssh/
chown -R chorus:chorus /home/chorus/.ssh
exit

# Connect as new user
ssh chorus@<IP>
```

## 3. Bootstrap (5 min)

```bash
curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/vps-setup/bootstrap.sh | bash
source ~/.bashrc
```

## 4. Auth Setup (3 min)

```bash
# Claude
claude auth login   # Login in browser

# Git
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

# GitHub SSH
ssh-keygen -t ed25519 -C "chorus-vps"
cat ~/.ssh/id_ed25519.pub
# → GitHub > Settings > SSH Keys > Add
```

## 5. Test (1 min)

```bash
./test-setup.sh
```

## 6. Clone Repos (2 min)

```bash
cd ~/workspace
git clone git@github.com:your-org/your-project.git
cd your-project && bd init
```

## 7. Start Working

```bash
~/workspace/start-agents.sh
tmux attach -t chorus
# Ctrl+b 1 → Claude window
# Ctrl+b d → Detach
```

---

## Cheat Sheet

| Command | Description |
|---------|-------------|
| `ssh chorus@<IP>` | Connect to VPS |
| `tmux attach -t chorus` | Attach to session |
| `Ctrl+b d` | Detach (session continues) |
| `Ctrl+b 0-3` | Switch window |
| `Ctrl+b c` | New window |
| `Ctrl+b &` | Close window |
| `bd ready` | Show available tasks |
| `bd create "task"` | Create new task |
| `bd close <id>` | Close task |

## Price Summary

| Item | Monthly |
|------|---------|
| Hetzner CX22 | €4.5 |
| Claude Max | $60 |
| ChatGPT Plus | $20 |
| **Total** | **~$90** |
