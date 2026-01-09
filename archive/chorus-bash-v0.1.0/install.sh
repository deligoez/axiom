#!/usr/bin/env bash
# Chorus CLI Installer
# https://github.com/deligoez/chorus
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/deligoez/chorus/main/install.sh | bash
#
# Or with custom install directory:
#   INSTALL_DIR=/custom/path ./install.sh

set -euo pipefail

# Configuration
REPO_URL="https://github.com/deligoez/chorus.git"
INSTALL_DIR="${INSTALL_DIR:-/usr/local}"
CHORUS_HOME="${CHORUS_HOME:-/opt/chorus}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}$1${NC}"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1" >&2; }

# Check for required commands
check_requirements() {
    local missing=()

    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    if ! command -v bash &> /dev/null; then
        missing+=("bash")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required commands: ${missing[*]}"
        echo "Please install them and try again."
        exit 1
    fi
}

# Install Chorus
install_chorus() {
    log_info "Installing Chorus CLI..."

    # Create or update installation
    if [[ -d "$CHORUS_HOME" ]]; then
        log_info "Updating existing installation..."
        cd "$CHORUS_HOME"
        sudo git pull --quiet
    else
        log_info "Cloning repository..."
        sudo git clone --quiet "$REPO_URL" "$CHORUS_HOME"
    fi

    # Initialize submodules (for tests)
    cd "$CHORUS_HOME"
    sudo git submodule update --init --recursive --quiet 2>/dev/null || true

    # Create symlink
    log_info "Creating symlink..."
    sudo mkdir -p "$INSTALL_DIR/bin"
    sudo ln -sf "$CHORUS_HOME/bin/chorus" "$INSTALL_DIR/bin/chorus"

    # Verify installation
    if command -v chorus &> /dev/null; then
        log_success "Chorus installed successfully!"
        echo ""
        chorus --version
    else
        log_warn "Chorus installed but not in PATH"
        echo "Add $INSTALL_DIR/bin to your PATH:"
        echo "  export PATH=\"$INSTALL_DIR/bin:\$PATH\""
    fi
}

# Show post-install instructions
show_instructions() {
    echo ""
    echo "Getting started:"
    echo "  cd your-project"
    echo "  chorus init --all"
    echo ""
    echo "Commands:"
    echo "  chorus init    - Initialize project"
    echo "  chorus loop    - Run autonomous loop"
    echo "  chorus squad   - Start multiple agents"
    echo "  chorus status  - Show current state"
    echo ""
    echo "Documentation: https://github.com/deligoez/chorus"
}

# Main
main() {
    echo "Chorus CLI Installer"
    echo "===================="
    echo ""

    check_requirements
    install_chorus
    show_instructions
}

main "$@"
