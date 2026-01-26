package detection

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectProjectMode_Greenfield(t *testing.T) {
	// Create empty temp directory
	dir := t.TempDir()

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Greenfield {
		t.Errorf("expected Greenfield, got %s", mode)
	}
}

func TestDetectProjectMode_Brownfield_WithGoMod(t *testing.T) {
	dir := t.TempDir()

	// Create go.mod
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module test"), 0o644); err != nil {
		t.Fatalf("failed to create go.mod: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Brownfield {
		t.Errorf("expected Brownfield, got %s", mode)
	}
}

func TestDetectProjectMode_Brownfield_WithPackageJSON(t *testing.T) {
	dir := t.TempDir()

	// Create package.json
	if err := os.WriteFile(filepath.Join(dir, "package.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("failed to create package.json: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Brownfield {
		t.Errorf("expected Brownfield, got %s", mode)
	}
}

func TestDetectProjectMode_Brownfield_WithCodeFile(t *testing.T) {
	dir := t.TempDir()

	// Create a Go file
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("package main"), 0o644); err != nil {
		t.Fatalf("failed to create main.go: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Brownfield {
		t.Errorf("expected Brownfield, got %s", mode)
	}
}

func TestDetectProjectMode_Greenfield_WithOnlyReadme(t *testing.T) {
	dir := t.TempDir()

	// Create only README.md (not a code or config file)
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("# Test"), 0o644); err != nil {
		t.Fatalf("failed to create README.md: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Greenfield {
		t.Errorf("expected Greenfield (README only), got %s", mode)
	}
}

func TestDetectProjectMode_SkipsNodeModules(t *testing.T) {
	dir := t.TempDir()

	// Create node_modules with code inside (should be skipped)
	nodeModules := filepath.Join(dir, "node_modules", "some-package")
	if err := os.MkdirAll(nodeModules, 0o755); err != nil {
		t.Fatalf("failed to create node_modules: %v", err)
	}
	if err := os.WriteFile(filepath.Join(nodeModules, "index.js"), []byte("module.exports = {}"), 0o644); err != nil {
		t.Fatalf("failed to create index.js: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should be Greenfield because node_modules is skipped
	if mode != Greenfield {
		t.Errorf("expected Greenfield (node_modules skipped), got %s", mode)
	}
}

func TestDetectProjectMode_SkipsHiddenDirs(t *testing.T) {
	dir := t.TempDir()

	// Create .git with files inside (should be skipped)
	gitDir := filepath.Join(dir, ".git")
	if err := os.MkdirAll(gitDir, 0o755); err != nil {
		t.Fatalf("failed to create .git: %v", err)
	}
	if err := os.WriteFile(filepath.Join(gitDir, "config"), []byte("[core]"), 0o644); err != nil {
		t.Fatalf("failed to create config: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should be Greenfield because .git is skipped
	if mode != Greenfield {
		t.Errorf("expected Greenfield (.git skipped), got %s", mode)
	}
}

func TestDetectProjectModeDetailed(t *testing.T) {
	dir := t.TempDir()

	// Create go.mod and some code files
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module test"), 0o644); err != nil {
		t.Fatalf("failed to create go.mod: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte("package main"), 0o644); err != nil {
		t.Fatalf("failed to create main.go: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "util.go"), []byte("package main"), 0o644); err != nil {
		t.Fatalf("failed to create util.go: %v", err)
	}

	result, err := DetectProjectModeDetailed(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Mode != Brownfield {
		t.Errorf("expected Brownfield, got %s", result.Mode)
	}

	if result.CodeFiles != 2 {
		t.Errorf("expected 2 code files, got %d", result.CodeFiles)
	}

	if len(result.ConfigFiles) != 1 || result.ConfigFiles[0] != "go.mod" {
		t.Errorf("expected [go.mod], got %v", result.ConfigFiles)
	}
}

func TestDetectProjectMode_WithCsproj(t *testing.T) {
	dir := t.TempDir()

	// Create a .csproj file (glob pattern test)
	if err := os.WriteFile(filepath.Join(dir, "MyProject.csproj"), []byte("<Project></Project>"), 0o644); err != nil {
		t.Fatalf("failed to create csproj: %v", err)
	}

	mode, err := DetectProjectMode(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mode != Brownfield {
		t.Errorf("expected Brownfield for .csproj, got %s", mode)
	}
}
