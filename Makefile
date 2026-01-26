# AXIOM Makefile

.PHONY: build test lint fmt clean all

# Default target
all: fmt lint test build

# Build the binary
build:
	go build -o bin/axiom ./cmd/axiom

# Run tests
test:
	go test -v ./...

# Run linter
lint:
	golangci-lint run

# Format code
fmt:
	gofmt -w .
	goimports -w .

# Clean build artifacts
clean:
	rm -rf bin/

# Quality check (run before commit)
check: fmt lint test build
	@echo "All checks passed!"
