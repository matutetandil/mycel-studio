package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// FSFileEntry represents a file in the project tree.
type FSFileEntry struct {
	Name         string `json:"name"`
	RelativePath string `json:"relativePath"`
	Content      string `json:"content"`
	IsDirectory  bool   `json:"isDirectory"`
}

// FSGitStatus represents git status for the project.
type FSGitStatus struct {
	IsRepo bool              `json:"isRepo"`
	Branch string            `json:"branch"`
	Files  map[string]string `json:"files"`
}

// Directories to skip when reading project tree
var skipDirs = map[string]bool{
	".git":         true,
	"node_modules": true,
	"vendor":       true,
	"dist":         true,
	".next":        true,
	"__pycache__":  true,
	".mypy_cache":  true,
	".pytest_cache": true,
	"target":       true,
	"build":        true,
}

// Binary file extensions to skip
var binaryExts = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".ico": true,
	".svg": true, ".webp": true, ".bmp": true, ".tiff": true,
	".mp3": true, ".mp4": true, ".avi": true, ".mov": true, ".wav": true,
	".zip": true, ".tar": true, ".gz": true, ".bz2": true, ".xz": true,
	".rar": true, ".7z": true,
	".wasm": true, ".exe": true, ".dll": true, ".so": true, ".dylib": true,
	".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true,
	".ttf": true, ".otf": true, ".woff": true, ".woff2": true, ".eot": true,
	".db": true, ".sqlite": true, ".sqlite3": true,
}

const maxFileSize = 512 * 1024 // 512 KB

// OpenDirectoryDialog opens a native directory picker.
func (a *App) OpenDirectoryDialog() (string, error) {
	path, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Open Mycel Project",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// ReadDirectoryTree reads all files in a directory recursively.
func (a *App) ReadDirectoryTree(rootPath string) ([]FSFileEntry, error) {
	var entries []FSFileEntry

	err := filepath.WalkDir(rootPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // skip errors
		}

		// Get relative path
		relPath, _ := filepath.Rel(rootPath, path)
		if relPath == "." {
			return nil
		}

		// Use forward slashes for consistency
		relPath = filepath.ToSlash(relPath)

		name := d.Name()

		// Skip hidden files/dirs (except .env, .env.example, .mycel-studio.json, .gitignore)
		if strings.HasPrefix(name, ".") && name != ".env" && name != ".env.example" &&
			name != ".mycel-studio.json" && name != ".gitignore" {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip known heavy directories
		if d.IsDir() {
			if skipDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		// Skip binary files
		ext := strings.ToLower(filepath.Ext(name))
		if binaryExts[ext] {
			return nil
		}

		// Check file size
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if info.Size() > maxFileSize {
			entries = append(entries, FSFileEntry{
				Name:         name,
				RelativePath: relPath,
				Content:      fmt.Sprintf("// File too large (%d bytes, max %d)", info.Size(), maxFileSize),
			})
			return nil
		}

		// Read content
		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		// Skip binary content
		if !utf8.Valid(data) {
			return nil
		}

		entries = append(entries, FSFileEntry{
			Name:         name,
			RelativePath: relPath,
			Content:      string(data),
		})

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	return entries, nil
}

// ReadFile reads a single file.
func (a *App) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFile writes content to a file, creating directories as needed.
func (a *App) WriteFile(path string, content string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// CreateDirectory creates a directory and all parents.
func (a *App) CreateDirectory(path string) error {
	return os.MkdirAll(path, 0755)
}

// DeleteFile removes a file.
func (a *App) DeleteFile(path string) error {
	return os.Remove(path)
}

// RenameFile renames (moves) a file or directory.
func (a *App) RenameFile(oldPath, newPath string) error {
	// Create parent directory of newPath if needed
	dir := filepath.Dir(newPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	return os.Rename(oldPath, newPath)
}

// FileExists checks if a path exists.
func (a *App) FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// WriteFileAtPath writes content to an absolute file path (for cross-project writes).
// Unlike WriteFile, this does not require an open project.
func (a *App) WriteFileAtPath(absolutePath string, content string) error {
	dir := filepath.Dir(absolutePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	return os.WriteFile(absolutePath, []byte(content), 0644)
}

// ReadFileAtPath reads a file from an absolute path (for cross-project reads).
func (a *App) ReadFileAtPath(absolutePath string) (string, error) {
	data, err := os.ReadFile(absolutePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetGitBlame returns git blame for a file as JSON array.
func (a *App) GetGitBlame(projectPath, relativePath string) (string, error) {
	cmd := exec.Command("git", "blame", "--line-porcelain", relativePath)
	cmd.Dir = projectPath
	out, err := cmd.Output()
	if err != nil {
		return "[]", err
	}

	type BlameLine struct {
		Line   int    `json:"line"`
		Hash   string `json:"hash"`
		Author string `json:"author"`
		Date   string `json:"date"`
	}

	var result []BlameLine
	var current BlameLine
	lineNum := 0

	for _, raw := range strings.Split(string(out), "\n") {
		if len(raw) == 0 {
			continue
		}
		if len(raw) >= 40 && raw[0] != '\t' && !strings.Contains(raw[:10], " ") == false {
			parts := strings.Fields(raw)
			if len(parts) >= 3 && len(parts[0]) == 40 {
				lineNum++
				current.Line = lineNum
				current.Hash = parts[0][:7]
			}
		}
		if strings.HasPrefix(raw, "author ") {
			current.Author = strings.TrimPrefix(raw, "author ")
		}
		if strings.HasPrefix(raw, "author-time ") {
			ts := strings.TrimPrefix(raw, "author-time ")
			// Convert unix timestamp to relative date
			var unix int64
			if _, err := fmt.Sscanf(ts, "%d", &unix); err == nil {
				t := time.Unix(unix, 0)
				current.Date = t.Format("2006-01-02")
			}
		}
		if raw[0] == '\t' {
			result = append(result, current)
			current = BlameLine{}
		}
	}

	data, _ := json.Marshal(result)
	return string(data), nil
}
func (a *App) DebugLog(message string) {
	f, err := os.OpenFile("/tmp/mycel-studio-debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "[%s] %s\n", time.Now().Format("15:04:05.000"), message)
}

// SaveFile opens a native save dialog and returns the selected path.
func (a *App) SaveFileDialog(defaultFilename string) (string, error) {
	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           "Save File",
		DefaultFilename: defaultFilename,
	})
	if err != nil {
		return "", err
	}
	return path, nil
}
