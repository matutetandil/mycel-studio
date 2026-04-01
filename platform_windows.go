//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows/registry"
)

// OpenNewWindow launches a new Mycel Studio instance on Windows.
func (a *App) OpenNewWindow(projectPath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	return launchBinary(execPath, projectPath)
}

// InstallCLI installs the "studio" command by adding a .cmd wrapper
// next to the executable and adding its directory to the user PATH.
func (a *App) InstallCLI() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("failed to get executable path: %w", err)
	}

	execDir := filepath.Dir(execPath)
	cmdPath := filepath.Join(execDir, "mycel-studio.cmd")

	script := fmt.Sprintf("@echo off\r\nstart \"\" \"%s\" --project \"%%~f1\"\r\n", execPath)

	if err := os.WriteFile(cmdPath, []byte(script), 0755); err != nil {
		return "", fmt.Errorf("failed to write mycel-studio.cmd: %w", err)
	}

	// Add to user PATH if not already there
	if err := addToUserPath(execDir); err != nil {
		return cmdPath, fmt.Errorf("installed at %s but failed to add to PATH: %w", cmdPath, err)
	}

	return cmdPath, nil
}

// UninstallCLI removes the mycel-studio.cmd and optionally cleans PATH.
func (a *App) UninstallCLI() error {
	execPath, _ := os.Executable()
	execDir := filepath.Dir(execPath)
	cmdPath := filepath.Join(execDir, "mycel-studio.cmd")

	os.Remove(cmdPath)
	removeFromUserPath(execDir)
	return nil
}

// IsCLIInstalled checks if mycel-studio.cmd exists next to the executable.
func (a *App) IsCLIInstalled() bool {
	execPath, err := os.Executable()
	if err != nil {
		return false
	}
	cmdPath := filepath.Join(filepath.Dir(execPath), "mycel-studio.cmd")
	_, err = os.Stat(cmdPath)
	return err == nil
}

func addToUserPath(dir string) error {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Environment`, registry.QUERY_VALUE|registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer k.Close()

	current, _, err := k.GetStringValue("Path")
	if err != nil && err != registry.ErrNotExist {
		return err
	}

	// Check if already in PATH
	for _, p := range strings.Split(current, ";") {
		if strings.EqualFold(strings.TrimSpace(p), dir) {
			return nil
		}
	}

	newPath := current
	if newPath != "" && !strings.HasSuffix(newPath, ";") {
		newPath += ";"
	}
	newPath += dir

	return k.SetStringValue("Path", newPath)
}

func removeFromUserPath(dir string) {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Environment`, registry.QUERY_VALUE|registry.SET_VALUE)
	if err != nil {
		return
	}
	defer k.Close()

	current, _, err := k.GetStringValue("Path")
	if err != nil {
		return
	}

	parts := strings.Split(current, ";")
	var filtered []string
	for _, p := range parts {
		if !strings.EqualFold(strings.TrimSpace(p), dir) && strings.TrimSpace(p) != "" {
			filtered = append(filtered, p)
		}
	}

	k.SetStringValue("Path", strings.Join(filtered, ";"))
}
