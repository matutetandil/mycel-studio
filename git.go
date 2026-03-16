package main

import (
	"os/exec"
	"path/filepath"
	"strings"
)

// IsGitRepo checks if the given path is inside a git repository.
func (a *App) IsGitRepo(path string) bool {
	cmd := exec.Command("git", "rev-parse", "--is-inside-work-tree")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "true"
}

// GetGitBranch returns the current git branch name.
func (a *App) GetGitBranch(path string) (string, error) {
	cmd := exec.Command("git", "branch", "--show-current")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// GetGitFileStatuses returns a map of relative file paths to their git status.
// Status values: "modified", "added", "deleted", "untracked", "renamed", "unmodified"
func (a *App) GetGitFileStatuses(path string) (map[string]string, error) {
	cmd := exec.Command("git", "status", "--porcelain", "-uall")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	statuses := make(map[string]string)
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if len(line) < 4 {
			continue
		}
		// Porcelain format: XY filename
		// X = index status, Y = work tree status
		xy := line[:2]
		file := strings.TrimSpace(line[3:])

		// Handle renames: "R  old -> new"
		if idx := strings.Index(file, " -> "); idx >= 0 {
			file = file[idx+4:]
		}

		// Normalize path separators
		file = filepath.ToSlash(file)

		switch {
		case xy == "??" :
			statuses[file] = "untracked"
		case xy == "!!" :
			statuses[file] = "ignored"
		case xy[0] == 'A' || xy[1] == 'A':
			statuses[file] = "added"
		case xy[0] == 'D' || xy[1] == 'D':
			statuses[file] = "deleted"
		case xy[0] == 'R' || xy[1] == 'R':
			statuses[file] = "renamed"
		case xy[0] == 'M' || xy[1] == 'M':
			statuses[file] = "modified"
		default:
			statuses[file] = "modified"
		}
	}

	return statuses, nil
}

// GetGitFileContent returns the content of a file as it exists in the HEAD commit.
// Returns empty string if the file is not tracked or if there's an error.
func (a *App) GetGitFileContent(projectPath string, filePath string) string {
	cmd := exec.Command("git", "show", "HEAD:"+filePath)
	cmd.Dir = projectPath
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(out)
}

// GetGitStatus returns full git status for a project directory.
func (a *App) GetGitStatus(path string) (*FSGitStatus, error) {
	if !a.IsGitRepo(path) {
		return &FSGitStatus{IsRepo: false}, nil
	}

	branch, _ := a.GetGitBranch(path)
	files, err := a.GetGitFileStatuses(path)
	if err != nil {
		return &FSGitStatus{
			IsRepo: true,
			Branch: branch,
			Files:  make(map[string]string),
		}, nil
	}

	return &FSGitStatus{
		IsRepo: true,
		Branch: branch,
		Files:  files,
	}, nil
}
