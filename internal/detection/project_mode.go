// Package detection provides project analysis utilities for AXIOM.
package detection

import (
	"os"
	"path/filepath"
	"strings"
)

// ProjectMode represents whether a project is new (greenfield) or existing (brownfield).
type ProjectMode string

const (
	// Greenfield indicates a new project with no existing code.
	Greenfield ProjectMode = "greenfield"
	// Brownfield indicates an existing project with code.
	Brownfield ProjectMode = "brownfield"
)

// CodeExtensions are file extensions that indicate source code.
var CodeExtensions = []string{
	".go",
	".ts", ".tsx",
	".js", ".jsx",
	".py",
	".rs",
	".java",
	".rb",
	".php",
	".cs",
	".cpp", ".c", ".h",
}

// ConfigFiles are files that indicate an existing project structure.
var ConfigFiles = []string{
	// Go
	"go.mod",
	"go.sum",
	// Node.js / TypeScript
	"package.json",
	"package-lock.json",
	"yarn.lock",
	"pnpm-lock.yaml",
	"tsconfig.json",
	// Python
	"pyproject.toml",
	"requirements.txt",
	"setup.py",
	"Pipfile",
	// Rust
	"Cargo.toml",
	"Cargo.lock",
	// Ruby
	"Gemfile",
	// PHP
	"composer.json",
	// Java
	"pom.xml",
	"build.gradle",
	// .NET
	"*.csproj",
	"*.sln",
}

// DetectProjectMode determines if a directory contains an existing project (brownfield)
// or is empty/new (greenfield).
//
// Detection logic:
//   - If code files exist → Brownfield
//   - If config files exist → Brownfield
//   - Otherwise → Greenfield
func DetectProjectMode(dir string) (ProjectMode, error) {
	hasCode, err := hasCodeFiles(dir)
	if err != nil {
		return "", err
	}
	if hasCode {
		return Brownfield, nil
	}

	hasConfig, err := hasConfigFiles(dir)
	if err != nil {
		return "", err
	}
	if hasConfig {
		return Brownfield, nil
	}

	return Greenfield, nil
}

// hasCodeFiles checks if the directory contains any source code files.
func hasCodeFiles(dir string) (bool, error) {
	found := false

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden directories and common non-source directories
		if d.IsDir() {
			name := d.Name()
			if strings.HasPrefix(name, ".") || isSkippedDir(name) {
				return filepath.SkipDir
			}
			return nil
		}

		// Check if file has a code extension
		ext := strings.ToLower(filepath.Ext(path))
		for _, codeExt := range CodeExtensions {
			if ext == codeExt {
				found = true
				return filepath.SkipAll // Found one, stop walking
			}
		}

		return nil
	})

	if err == filepath.SkipAll {
		err = nil
	}

	return found, err
}

// hasConfigFiles checks if the directory contains any project config files.
func hasConfigFiles(dir string) (bool, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		for _, configFile := range ConfigFiles {
			// Handle glob patterns like "*.csproj"
			if strings.HasPrefix(configFile, "*") {
				ext := strings.TrimPrefix(configFile, "*")
				if strings.HasSuffix(name, ext) {
					return true, nil
				}
			} else if name == configFile {
				return true, nil
			}
		}
	}

	return false, nil
}

// isSkippedDir returns true for directories that should not be scanned for code.
func isSkippedDir(name string) bool {
	skipped := []string{
		"node_modules",
		"vendor",
		"dist",
		"build",
		"target",
		"__pycache__",
		".git",
		".axiom",
	}
	for _, s := range skipped {
		if name == s {
			return true
		}
	}
	return false
}

// DetectionResult provides detailed information about project detection.
type DetectionResult struct {
	Mode        ProjectMode `json:"mode"`
	CodeFiles   int         `json:"codeFiles"`
	ConfigFiles []string    `json:"configFiles"`
}

// DetectProjectModeDetailed returns detailed detection results.
func DetectProjectModeDetailed(dir string) (*DetectionResult, error) {
	result := &DetectionResult{
		ConfigFiles: []string{},
	}

	// Count code files
	codeCount := 0
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			name := d.Name()
			if strings.HasPrefix(name, ".") || isSkippedDir(name) {
				return filepath.SkipDir
			}
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		for _, codeExt := range CodeExtensions {
			if ext == codeExt {
				codeCount++
				break
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	result.CodeFiles = codeCount

	// Find config files
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		for _, configFile := range ConfigFiles {
			if strings.HasPrefix(configFile, "*") {
				ext := strings.TrimPrefix(configFile, "*")
				if strings.HasSuffix(name, ext) {
					result.ConfigFiles = append(result.ConfigFiles, name)
					break
				}
			} else if name == configFile {
				result.ConfigFiles = append(result.ConfigFiles, name)
				break
			}
		}
	}

	// Determine mode
	if result.CodeFiles > 0 || len(result.ConfigFiles) > 0 {
		result.Mode = Brownfield
	} else {
		result.Mode = Greenfield
	}

	return result, nil
}
