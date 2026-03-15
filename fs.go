package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
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

// FileExists checks if a path exists.
func (a *App) FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
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
