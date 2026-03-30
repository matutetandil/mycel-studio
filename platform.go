package main

import (
	"os/exec"
	"path/filepath"
)

// launchBinary starts a new instance of the binary with --project flag.
// Used as fallback on all platforms (and primary launch on Linux/Windows).
func launchBinary(execPath, projectPath string) error {
	args := []string{}
	if projectPath != "" {
		args = append(args, "--project", projectPath)
	}
	cmd := exec.Command(execPath, args...)
	cmd.Dir = filepath.Dir(execPath)
	return cmd.Start()
}
