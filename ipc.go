package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// IPC protocol for communication between Mycel Studio instances.
// Each instance listens on ~/.mycel-studio/ipc-{pid}.sock.
// The "studio" CLI (or a new instance) scans sockets to find running instances.

const ipcDirName = ".mycel-studio"

type ipcRequest struct {
	Cmd     string `json:"cmd"`
	Project string `json:"project,omitempty"`
}

type ipcResponse struct {
	Status  string `json:"status"`
	Project string `json:"project,omitempty"`
}

func ipcDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ipcDirName)
}

func (a *App) ipcSocketPath() string {
	return filepath.Join(ipcDir(), fmt.Sprintf("ipc-%d.sock", os.Getpid()))
}

// startIPCServer creates a Unix socket and listens for commands from other instances.
func (a *App) startIPCServer() {
	dir := ipcDir()
	os.MkdirAll(dir, 0755)

	sockPath := a.ipcSocketPath()
	os.Remove(sockPath) // clean up stale socket

	ln, err := net.Listen("unix", sockPath)
	if err != nil {
		return
	}
	a.ipcListener = ln

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return // listener closed
			}
			go a.handleIPCConn(conn)
		}
	}()
}

func (a *App) handleIPCConn(conn net.Conn) {
	defer conn.Close()

	decoder := json.NewDecoder(conn)
	encoder := json.NewEncoder(conn)

	var req ipcRequest
	if err := decoder.Decode(&req); err != nil {
		return
	}

	switch req.Cmd {
	case "query":
		// Report which project this instance has open
		project := ""
		if a.ideProjectPath != "" {
			project = a.ideProjectPath
		} else if a.startupProject != "" {
			project = a.startupProject
		}
		encoder.Encode(ipcResponse{Status: "ok", Project: project})

	case "open":
		// Open a project in this instance
		if a.ctx != nil {
			wailsRuntime.EventsEmit(a.ctx, "ipc:open-project", req.Project)
		}
		encoder.Encode(ipcResponse{Status: "ok"})

	case "focus":
		// Bring this window to the front
		if a.ctx != nil {
			wailsRuntime.WindowShow(a.ctx)
			wailsRuntime.WindowSetAlwaysOnTop(a.ctx, true)
			wailsRuntime.WindowSetAlwaysOnTop(a.ctx, false)
		}
		encoder.Encode(ipcResponse{Status: "ok"})
	}
}

// stopIPCServer cleans up the socket.
func (a *App) stopIPCServer() {
	if a.ipcListener != nil {
		a.ipcListener.Close()
		os.Remove(a.ipcSocketPath())
	}
}

// cleanStaleSockets removes sockets for processes that are no longer running.
func cleanStaleSockets() {
	dir := ipcDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if !strings.HasPrefix(e.Name(), "ipc-") || !strings.HasSuffix(e.Name(), ".sock") {
			continue
		}
		pidStr := strings.TrimPrefix(e.Name(), "ipc-")
		pidStr = strings.TrimSuffix(pidStr, ".sock")
		pid, err := strconv.Atoi(pidStr)
		if err != nil {
			continue
		}
		// Check if process is still running
		proc, err := os.FindProcess(pid)
		if err != nil {
			os.Remove(filepath.Join(dir, e.Name()))
			continue
		}
		// On Unix, FindProcess always succeeds. Use Signal(0) to check.
		if err := proc.Signal(syscall.Signal(0)); err != nil {
			os.Remove(filepath.Join(dir, e.Name()))
		}
	}
}

// tryReuseInstance scans running instances to find one that already has the given project open.
// Returns true if an existing instance was reused (caller should exit).
func tryReuseInstance(projectPath string) bool {
	cleanStaleSockets()

	dir := ipcDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}

	absProject, _ := filepath.Abs(projectPath)

	var emptyInstance string // socket of an instance with no project

	for _, e := range entries {
		if !strings.HasPrefix(e.Name(), "ipc-") || !strings.HasSuffix(e.Name(), ".sock") {
			continue
		}
		sockPath := filepath.Join(dir, e.Name())

		// Query the instance
		resp, err := ipcQuery(sockPath)
		if err != nil {
			continue
		}

		if resp.Project != "" {
			absResp, _ := filepath.Abs(resp.Project)
			if absResp == absProject {
				// Found an instance with this project — bring it to front
				ipcSendCmd(sockPath, ipcRequest{Cmd: "focus"})
				return true
			}
		} else if emptyInstance == "" {
			emptyInstance = sockPath
		}
	}

	// No instance has this project. If there's one with no project, open it there.
	if emptyInstance != "" {
		ipcSendCmd(emptyInstance, ipcRequest{Cmd: "open", Project: absProject})
		ipcSendCmd(emptyInstance, ipcRequest{Cmd: "focus"})
		return true
	}

	return false
}

func ipcQuery(sockPath string) (*ipcResponse, error) {
	conn, err := net.Dial("unix", sockPath)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	encoder := json.NewEncoder(conn)
	decoder := json.NewDecoder(conn)

	encoder.Encode(ipcRequest{Cmd: "query"})

	var resp ipcResponse
	if err := decoder.Decode(&resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func ipcSendCmd(sockPath string, req ipcRequest) error {
	conn, err := net.Dial("unix", sockPath)
	if err != nil {
		return err
	}
	defer conn.Close()

	encoder := json.NewEncoder(conn)
	decoder := json.NewDecoder(conn)

	encoder.Encode(req)

	var resp ipcResponse
	decoder.Decode(&resp)
	return nil
}
