package main

import (
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/creack/pty"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// PTYSession represents a single terminal session.
type PTYSession struct {
	ID   string
	cmd  *exec.Cmd
	ptmx *os.File
}

// PTYManager manages terminal sessions for the Wails app.
type PTYManager struct {
	app      *App
	sessions map[string]*PTYSession
	counter  int
	mu       sync.Mutex
}

// NewPTYManager creates a new PTY manager.
func NewPTYManager() *PTYManager {
	return &PTYManager{
		sessions: make(map[string]*PTYSession),
	}
}

// SetApp stores the App reference for event emission.
func (m *PTYManager) SetApp(app *App) {
	m.app = app
}

// CreateTerminal spawns a new terminal session and returns its ID.
// workDir sets the initial working directory for the shell.
func (m *PTYManager) CreateTerminal(cols, rows int, workDir string) (string, error) {
	m.mu.Lock()
	m.counter++
	id := fmt.Sprintf("term-%d", m.counter)
	m.mu.Unlock()

	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/zsh"
	}
	// Verify shell exists, fallback to common paths
	if _, err := os.Stat(shell); err != nil {
		for _, candidate := range []string{"/bin/zsh", "/bin/bash", "/bin/sh"} {
			if _, err := os.Stat(candidate); err == nil {
				shell = candidate
				break
			}
		}
	}

	cmd := exec.Command(shell, "-l")
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"SHELL="+shell,
		"LANG=en_US.UTF-8",
		"LC_ALL=en_US.UTF-8",
	)
	// Only use absolute paths for working directory
	home, _ := os.UserHomeDir()
	if workDir != "" && workDir[0] == '/' {
		cmd.Dir = workDir
	} else if home != "" {
		cmd.Dir = home
	}

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
		Cols: uint16(cols),
		Rows: uint16(rows),
	})
	if err != nil {
		return "", fmt.Errorf("failed to start pty: %w", err)
	}

	session := &PTYSession{
		ID:   id,
		cmd:  cmd,
		ptmx: ptmx,
	}

	m.mu.Lock()
	m.sessions[id] = session
	m.mu.Unlock()

	// Read from PTY and emit to frontend.
	// Use a large buffer so interactive programs that redraw full screens
	// (cursor moves + colors + text) fit in a single read/emit cycle.
	go func() {
		buf := make([]byte, 65536)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				// PTY closed or process exited
				wailsRuntime.EventsEmit(m.app.ctx, "terminal:exit:"+id)
				return
			}
			if n > 0 {
				encoded := base64.StdEncoding.EncodeToString(buf[:n])
				wailsRuntime.EventsEmit(m.app.ctx, "terminal:output:"+id, encoded)
			}
		}
	}()

	return id, nil
}

// WriteTerminal sends input data to a terminal session.
func (m *PTYManager) WriteTerminal(id string, data string) error {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok {
		return fmt.Errorf("terminal session %s not found", id)
	}

	_, err := session.ptmx.WriteString(data)
	return err
}

// ResizeTerminal changes the terminal size.
func (m *PTYManager) ResizeTerminal(id string, cols, rows int) error {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok {
		return fmt.Errorf("terminal session %s not found", id)
	}

	return pty.Setsize(session.ptmx, &pty.Winsize{
		Cols: uint16(cols),
		Rows: uint16(rows),
	})
}

// CloseTerminal kills a terminal session.
func (m *PTYManager) CloseTerminal(id string) error {
	m.mu.Lock()
	session, ok := m.sessions[id]
	if ok {
		delete(m.sessions, id)
	}
	m.mu.Unlock()

	if !ok {
		return nil
	}

	session.ptmx.Close()
	if session.cmd.Process != nil {
		session.cmd.Process.Kill()
		session.cmd.Wait()
	}
	return nil
}

// GetTerminalCwd returns the current working directory of a terminal session.
func (m *PTYManager) GetTerminalCwd(id string) string {
	m.mu.Lock()
	session, ok := m.sessions[id]
	m.mu.Unlock()

	if !ok || session.cmd.Process == nil {
		return ""
	}

	pid := session.cmd.Process.Pid
	// macOS: use lsof to get the cwd of the child process
	out, err := exec.Command("lsof", "-a", "-d", "cwd", "-p", fmt.Sprintf("%d", pid), "-Fn").Output()
	if err != nil {
		return ""
	}

	// Parse lsof output: lines starting with "n" contain the path
	for _, line := range strings.Split(string(out), "\n") {
		if strings.HasPrefix(line, "n") && len(line) > 1 {
			return line[1:]
		}
	}
	return ""
}

// Shutdown closes all terminal sessions.
func (m *PTYManager) Shutdown() {
	m.mu.Lock()
	ids := make([]string, 0, len(m.sessions))
	for id := range m.sessions {
		ids = append(ids, id)
	}
	m.mu.Unlock()

	for _, id := range ids {
		m.CloseTerminal(id)
	}
}
