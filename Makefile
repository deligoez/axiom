.PHONY: test test-verbose install uninstall clean help

# Default target
help:
	@echo "Chorus CLI - Make targets"
	@echo ""
	@echo "  make test          Run all tests"
	@echo "  make test-verbose  Run tests with verbose output"
	@echo "  make install       Install chorus CLI to /usr/local/bin"
	@echo "  make uninstall     Remove chorus CLI"
	@echo "  make clean         Remove generated files"
	@echo ""

# Run tests
test:
	@./test/bats/bin/bats test/*.bats

# Run tests with verbose output
test-verbose:
	@./test/bats/bin/bats --verbose-run test/*.bats

# Install to system
install:
	@echo "Installing Chorus CLI..."
	@sudo mkdir -p /opt/chorus
	@sudo cp -r bin lib templates /opt/chorus/
	@sudo ln -sf /opt/chorus/bin/chorus /usr/local/bin/chorus
	@echo "✓ Installed to /usr/local/bin/chorus"

# Uninstall from system
uninstall:
	@echo "Uninstalling Chorus CLI..."
	@sudo rm -f /usr/local/bin/chorus
	@sudo rm -rf /opt/chorus
	@echo "✓ Uninstalled"

# Clean generated files
clean:
	@rm -rf .bats-run-*
	@echo "✓ Cleaned"

# Initialize submodules (for fresh clone)
init-submodules:
	@git submodule update --init --recursive
