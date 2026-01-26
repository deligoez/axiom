# AXIOM Makefile

.PHONY: build test lint fmt clean all run dev css

# Default target
all: fmt lint test build

# Build the binary
build:
	go build -o bin/axiom ./cmd/axiom

# Build CSS
css:
	npm run css:build

# Run the server
run: css build
	./bin/axiom

# Development mode (Go server + Tailwind watch)
dev:
	@echo "Starting AXIOM in development mode..."
	@npm run css:build
	@trap 'kill 0' SIGINT; \
		npm run css:watch & \
		go run ./cmd/axiom

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
