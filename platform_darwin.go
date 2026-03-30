//go:build darwin

package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// OpenNewWindow launches a new Mycel Studio instance on macOS via "open -n".
func (a *App) OpenNewWindow(projectPath string) error {
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Navigate from .app/Contents/MacOS/binary up to .app
	appBundle := execPath
	if idx := strings.Index(execPath, ".app/"); idx != -1 {
		appBundle = execPath[:idx+4]
	}

	if strings.HasSuffix(appBundle, ".app") {
		args := []string{"-n", appBundle}
		if projectPath != "" {
			args = append(args, "--args", "--project", projectPath)
		}
		return exec.Command("open", args...).Start()
	}

	// Fallback for non-bundled (dev mode)
	return launchBinary(execPath, projectPath)
}

// InstallCLI installs the "studio" command to /usr/local/bin on macOS.
func (a *App) InstallCLI() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("failed to get executable path: %w", err)
	}

	target := "/usr/local/bin/mycel-studio"
	appBundle := execPath
	if idx := strings.Index(execPath, ".app/"); idx != -1 {
		appBundle = execPath[:idx+4]
	}

	script := fmt.Sprintf(`#!/bin/bash
# Mycel Studio CLI launcher
DIR="${1:-.}"
ABS_DIR="$(cd "$DIR" 2>/dev/null && pwd)"
if [ -z "$ABS_DIR" ]; then
  echo "Error: directory '$DIR' does not exist" >&2
  exit 1
fi
open -n "%s" --args --project "$ABS_DIR"
`, appBundle)

	if err := os.WriteFile(target, []byte(script), 0755); err != nil {
		// Try with sudo via osascript
		escaped := strings.ReplaceAll(script, "'", "'\\''")
		cmd := exec.Command("osascript", "-e",
			fmt.Sprintf(`do shell script "echo '%s' > %s && chmod +x %s" with administrator privileges`,
				escaped, target, target))
		if err2 := cmd.Run(); err2 != nil {
			return "", fmt.Errorf("failed to install CLI: %w", err2)
		}
	}

	return target, nil
}

// UninstallCLI removes the "studio" command from /usr/local/bin on macOS.
func (a *App) UninstallCLI() error {
	target := "/usr/local/bin/mycel-studio"
	if err := os.Remove(target); err != nil {
		cmd := exec.Command("osascript", "-e",
			fmt.Sprintf(`do shell script "rm -f %s" with administrator privileges`, target))
		return cmd.Run()
	}
	return nil
}

// IsCLIInstalled checks if the "studio" CLI command is installed on macOS.
func (a *App) IsCLIInstalled() bool {
	_, err := os.Stat("/usr/local/bin/mycel-studio")
	return err == nil
}
