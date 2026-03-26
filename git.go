package main

import (
	"encoding/json"
	"fmt"
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
	cmd := exec.Command("git", "status", "--porcelain", "-uall", "--ignored")
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
		// X = index (staged) status, Y = work tree (unstaged) status
		x := line[0] // staged
		y := line[1] // unstaged
		file := strings.TrimSpace(line[3:])

		// Handle renames: "R  old -> new"
		if idx := strings.Index(file, " -> "); idx >= 0 {
			file = file[idx+4:]
		}

		// Normalize path separators
		file = filepath.ToSlash(file)

		switch {
		case x == '?' && y == '?':
			statuses[file] = "untracked"
		case x == '!' && y == '!':
			statuses[file] = "ignored"
		case x != ' ' && x != '?' && y != ' ' && y != '?':
			// Both staged AND has unstaged changes
			statuses[file] = "staged_modified"
		case x == 'A' && y == ' ':
			statuses[file] = "staged_added"
		case x == 'D' && y == ' ':
			statuses[file] = "staged_deleted"
		case x == 'R' && y == ' ':
			statuses[file] = "staged_renamed"
		case x == 'M' && y == ' ':
			statuses[file] = "staged"
		case x != ' ' && x != '?' && y == ' ':
			// Staged (catch-all for other staged states)
			statuses[file] = "staged"
		case y == 'M':
			statuses[file] = "modified"
		case y == 'D':
			statuses[file] = "deleted"
		case y == 'A':
			statuses[file] = "added"
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

// GitLogEntry represents a single commit.
type GitLogEntry struct {
	Hash      string   `json:"hash"`
	Abbrev    string   `json:"abbrev"`
	Author    string   `json:"author"`
	Date      string   `json:"date"`
	Message   string   `json:"message"`
	Parents   []string `json:"parents"`
	Refs      []string `json:"refs"`
}

// GetGitLog returns the git log as JSON array.
func (a *App) GetGitLog(path string, limit int) (string, error) {
	if limit <= 0 { limit = 100 }
	// Use record separator (RS, \x1e) between fields and group separator (GS, \x1d) between commits
	format := `%H%x1e%h%x1e%an%x1e%aI%x1e%s%x1e%P%x1e%D%x1d`
	cmd := exec.Command("git", "log", "--all", "--format="+format, "-n", fmt.Sprintf("%d", limit))
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil { return "[]", err }

	var entries []GitLogEntry
	records := strings.Split(string(out), "\x1d")
	for _, record := range records {
		record = strings.TrimSpace(record)
		if record == "" { continue }
		fields := strings.Split(record, "\x1e")
		if len(fields) < 7 { continue }

		parents := []string{}
		if fields[5] != "" {
			parents = strings.Fields(fields[5])
		}
		refs := []string{}
		if fields[6] != "" {
			for _, r := range strings.Split(fields[6], ", ") {
				r = strings.TrimSpace(r)
				if r != "" { refs = append(refs, r) }
			}
		}
		entries = append(entries, GitLogEntry{
			Hash:    fields[0],
			Abbrev:  fields[1],
			Author:  fields[2],
			Date:    fields[3],
			Message: fields[4],
			Parents: parents,
			Refs:    refs,
		})
	}

	data, _ := json.Marshal(entries)
	return string(data), nil
}

// GitBranchInfo represents a git branch.
type GitBranchInfo struct {
	Name    string `json:"name"`
	Current bool   `json:"current"`
	Remote  string `json:"remote"`
}

// GetGitBranches returns all branches.
func (a *App) GetGitBranches(path string) (string, error) {
	cmd := exec.Command("git", "branch", "-a", "--format=%(refname:short)\t%(HEAD)\t%(upstream:short)")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil { return "[]", err }

	var branches []GitBranchInfo
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" { continue }
		parts := strings.SplitN(line, "\t", 3)
		name := parts[0]
		current := len(parts) > 1 && parts[1] == "*"
		remote := ""
		if len(parts) > 2 { remote = parts[2] }
		branches = append(branches, GitBranchInfo{Name: name, Current: current, Remote: remote})
	}

	data, _ := json.Marshal(branches)
	return string(data), nil
}

// GitCommitFile represents a file changed in a commit.
type GitCommitFile struct {
	Status  string `json:"status"`
	Path    string `json:"path"`
	OldPath string `json:"oldPath,omitempty"` // For renames
	NewPath string `json:"newPath,omitempty"` // For renames
}

// GetGitCommitFiles returns files changed in a commit (with rename detection).
func (a *App) GetGitCommitFiles(path string, hash string) (string, error) {
	cmd := exec.Command("git", "diff-tree", "--no-commit-id", "-r", "-M", "--name-status", hash)
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil { return "[]", err }

	var files []GitCommitFile
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" { continue }
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			status := parts[0]
			filePath := parts[1]
			f := GitCommitFile{Status: status, Path: filePath}
			// Rename: status is R100 (or R with percentage), has old and new path
			if strings.HasPrefix(status, "R") && len(parts) >= 3 {
				f.Status = "R"
				f.Path = parts[1] + " → " + parts[2]
				f.OldPath = parts[1]
				f.NewPath = parts[2]
			}
			files = append(files, f)
		}
	}

	data, _ := json.Marshal(files)
	return string(data), nil
}

// GetGitFileAtCommit returns file content at a specific commit.
func (a *App) GetGitFileAtCommit(path string, hash string, filePath string) (string, error) {
	cmd := exec.Command("git", "show", hash+":"+filePath)
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil { return "", err }
	return string(out), nil
}

// GetGitMergeConflicts returns files with unresolved merge conflicts.
func (a *App) GetGitMergeConflicts(path string) (string, error) {
	cmd := exec.Command("git", "diff", "--name-only", "--diff-filter=U")
	cmd.Dir = path
	out, err := cmd.Output()
	if err != nil { return "[]", err }

	var files []string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line != "" { files = append(files, line) }
	}

	data, _ := json.Marshal(files)
	return string(data), nil
}

// GitStageFile stages a file (git add).
func (a *App) GitStageFile(path string, filePath string) error {
	cmd := exec.Command("git", "add", filePath)
	cmd.Dir = path
	return cmd.Run()
}
