// Package agent provides agent spawning and management for AXIOM.
package agent

import (
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

// PTYAgent manages a process running in a pseudo-terminal.
// It provides real-time streaming of output and stdin writing capability.
type PTYAgent struct {
	Timeout time.Duration

	mu      sync.Mutex
	cmd     *exec.Cmd
	ptyFile *os.File
	running bool
}

// NewPTYAgent creates a new PTY agent with default settings.
func NewPTYAgent() *PTYAgent {
	return &PTYAgent{
		Timeout: 5 * time.Minute, // Default timeout
	}
}

// Run executes a command and returns all output when complete.
// This is a blocking call.
func (a *PTYAgent) Run(name string, args ...string) (string, error) {
	chunks := make(chan string, 1000)
	done := make(chan error, 1)

	go a.RunStreaming(name, args, chunks, done)

	var output string
	timeout := time.After(a.Timeout)

	for {
		select {
		case chunk, ok := <-chunks:
			if !ok {
				// Channel closed, wait for done
				err := <-done
				return output, err
			}
			output += chunk
		case <-timeout:
			_ = a.Stop()
			// Drain channels
			for range chunks {
			}
			<-done
			return output, errors.New("timeout: command took too long")
		}
	}
}

// RunStreaming executes a command and streams output to the chunks channel.
// The done channel receives nil on success or an error on failure.
// Chunks channel is closed when output is complete.
func (a *PTYAgent) RunStreaming(name string, args []string, chunks chan<- string, done chan<- error) {
	a.mu.Lock()

	// Create command
	a.cmd = exec.Command(name, args...)

	// Start in PTY
	ptmx, err := pty.Start(a.cmd)
	if err != nil {
		a.mu.Unlock()
		close(chunks)
		done <- fmt.Errorf("failed to start PTY: %w", err)
		return
	}

	a.ptyFile = ptmx
	a.running = true
	a.mu.Unlock()

	// Read output in goroutine
	go func() {
		defer close(chunks)

		buf := make([]byte, 1024)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				chunks <- string(buf[:n])
			}
			if err != nil {
				if err != io.EOF {
					// PTY closed or process exited - this is normal
					_ = err
				}
				break
			}
		}
	}()

	// Wait for process to complete
	waitErr := a.cmd.Wait()

	a.mu.Lock()
	a.running = false
	_ = ptmx.Close()
	a.ptyFile = nil
	a.mu.Unlock()

	done <- waitErr
}

// Write sends data to the process's stdin.
func (a *PTYAgent) Write(data string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.running || a.ptyFile == nil {
		return errors.New("process not running")
	}

	_, err := a.ptyFile.WriteString(data)
	return err
}

// Stop gracefully stops the running process.
// It first sends SIGTERM, then SIGKILL if the process doesn't exit.
func (a *PTYAgent) Stop() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.running || a.cmd == nil || a.cmd.Process == nil {
		return nil // Already stopped
	}

	// Try graceful shutdown first
	if err := a.cmd.Process.Signal(syscall.SIGTERM); err != nil {
		// Process might already be dead
		return nil
	}

	// Give it a moment to exit gracefully
	go func() {
		time.Sleep(500 * time.Millisecond)
		a.mu.Lock()
		defer a.mu.Unlock()
		if a.running && a.cmd != nil && a.cmd.Process != nil {
			_ = a.cmd.Process.Kill()
		}
	}()

	return nil
}

// IsRunning returns whether the process is currently running.
func (a *PTYAgent) IsRunning() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.running
}
