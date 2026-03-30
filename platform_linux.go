//go:build linux

package main

import (
	"fmt"
	"os"
	"os/exec"
)

// OpenNewWindow launches a new Mycel Studio instance on Linux.
func (a *App) OpenNewWindow(projectPath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	return launchBinary(execPath, projectPath)
}

// InstallCLI installs the "studio" command to /usr/local/bin on Linux.
func (a *App) InstallCLI() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("failed to get executable path: %w", err)
	}

	target := "/usr/local/bin/mycel-studio"
	script := fmt.Sprintf(`#!/bin/bash
# Mycel Studio CLI launcher
DIR="${1:-.}"
ABS_DIR="$(cd "$DIR" 2>/dev/null && pwd)"
if [ -z "$ABS_DIR" ]; then
  echo "Error: directory '$DIR' does not exist" >&2
  exit 1
fi
"%s" --project "$ABS_DIR" &
disown
`, execPath)

	if err := os.WriteFile(target, []byte(script), 0755); err != nil {
		// Try with pkexec for admin privileges
		cmd := exec.Command("pkexec", "bash", "-c",
			fmt.Sprintf("echo '%s' > %s && chmod +x %s", script, target, target))
		if err2 := cmd.Run(); err2 != nil {
			return "", fmt.Errorf("failed to install CLI: %w", err2)
		}
	}

	return target, nil
}

// UninstallCLI removes the "studio" command from /usr/local/bin on Linux.
func (a *App) UninstallCLI() error {
	target := "/usr/local/bin/mycel-studio"
	if err := os.Remove(target); err != nil {
		cmd := exec.Command("pkexec", "rm", "-f", target)
		return cmd.Run()
	}
	return nil
}

// IsCLIInstalled checks if the "studio" CLI command is installed on Linux.
func (a *App) IsCLIInstalled() bool {
	_, err := os.Stat("/usr/local/bin/mycel-studio")
	return err == nil
}
