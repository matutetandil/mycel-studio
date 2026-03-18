package main

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// UpdateInfo holds information about an available update.
type UpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	ReleaseURL     string `json:"releaseURL"`
	ReleaseNotes   string `json:"releaseNotes"`
	AssetName      string `json:"assetName"`
	AssetURL       string `json:"assetURL"`
	ChecksumURL    string `json:"checksumURL"`
	Available      bool   `json:"available"`
}

// UpdateProgress reports download/install progress to the frontend.
type UpdateProgress struct {
	Stage   string  `json:"stage"`   // "downloading", "verifying", "installing", "done", "error"
	Percent float64 `json:"percent"` // 0-100
	Message string  `json:"message"`
}

// Updater handles checking for and applying updates from GitHub Releases.
type Updater struct {
	app            *App
	currentVersion string
	repo           string
	cachedInfo     *UpdateInfo
}

// NewUpdater creates a new Updater.
func NewUpdater(currentVersion string) *Updater {
	return &Updater{
		currentVersion: currentVersion,
		repo:           "matutetandil/mycel-studio",
	}
}

// CheckForUpdates queries GitHub Releases for a newer version.
func (u *Updater) CheckForUpdates() (*UpdateInfo, error) {
	if u.currentVersion == "dev" {
		return &UpdateInfo{Available: false, CurrentVersion: u.currentVersion}, nil
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", u.repo)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var release struct {
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
		Body    string `json:"body"`
		Assets  []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release: %w", err)
	}

	latestVersion := strings.TrimPrefix(release.TagName, "v")
	if !isNewer(latestVersion, u.currentVersion) {
		return &UpdateInfo{
			Available:      false,
			CurrentVersion: u.currentVersion,
			LatestVersion:  latestVersion,
		}, nil
	}

	assetName := getAssetName()
	if assetName == "" {
		return nil, fmt.Errorf("unsupported platform: %s/%s", runtime.GOOS, runtime.GOARCH)
	}

	info := &UpdateInfo{
		CurrentVersion: u.currentVersion,
		LatestVersion:  latestVersion,
		ReleaseURL:     release.HTMLURL,
		ReleaseNotes:   truncateNotes(release.Body, 500),
		Available:      true,
	}

	for _, asset := range release.Assets {
		if asset.Name == assetName {
			info.AssetName = asset.Name
			info.AssetURL = asset.BrowserDownloadURL
		}
		if asset.Name == "checksums.txt" {
			info.ChecksumURL = asset.BrowserDownloadURL
		}
	}

	if info.AssetURL == "" {
		return nil, fmt.Errorf("no asset found for %s", assetName)
	}

	u.cachedInfo = info
	return info, nil
}

// DownloadAndInstall downloads the update asset and installs it.
func (u *Updater) DownloadAndInstall(assetURL, checksumURL, assetName string) error {
	u.emitProgress("downloading", 0, "Downloading update...")

	// Download to temp file
	tmpDir, err := os.MkdirTemp("", "mycel-update-*")
	if err != nil {
		u.emitProgress("error", 0, err.Error())
		return err
	}
	defer os.RemoveAll(tmpDir)

	tmpFile := filepath.Join(tmpDir, assetName)
	if err := u.downloadFile(assetURL, tmpFile); err != nil {
		u.emitProgress("error", 0, err.Error())
		return err
	}

	// Verify checksum
	if checksumURL != "" {
		u.emitProgress("verifying", 0, "Verifying checksum...")
		if err := u.verifyChecksum(tmpFile, assetName, checksumURL); err != nil {
			u.emitProgress("error", 0, err.Error())
			return err
		}
	}

	// Install
	u.emitProgress("installing", 0, "Installing update...")
	switch runtime.GOOS {
	case "darwin":
		err = u.applyMacOS(tmpFile)
	case "linux":
		err = u.applyLinux(tmpFile)
	case "windows":
		err = u.applyWindows(tmpFile)
	default:
		err = fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	if err != nil {
		u.emitProgress("error", 0, err.Error())
		return err
	}

	u.emitProgress("done", 100, "Update installed. Restart to apply.")
	return nil
}

// RestartApp relaunches the application after an update.
func (u *Updater) RestartApp() error {
	switch runtime.GOOS {
	case "darwin":
		appBundle := u.getMacOSAppBundle()
		if appBundle != "" {
			exec.Command("open", "-n", appBundle).Start()
		}
	case "linux":
		exe, _ := os.Executable()
		exe, _ = filepath.EvalSymlinks(exe)
		cmd := exec.Command(exe)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Start()
	case "windows":
		exe, _ := os.Executable()
		cmd := exec.Command(exe)
		cmd.Start()
	}

	u.app.skipCloseConfirm = true
	wailsRuntime.Quit(u.app.ctx)
	return nil
}

// GetCurrentVersion returns the running version.
func (u *Updater) GetCurrentVersion() string {
	return u.currentVersion
}

// --- Private methods ---

func (u *Updater) emitProgress(stage string, percent float64, message string) {
	if u.app != nil && u.app.ctx != nil {
		wailsRuntime.EventsEmit(u.app.ctx, "updater:progress", UpdateProgress{
			Stage:   stage,
			Percent: percent,
			Message: message,
		})
	}
}

func (u *Updater) downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download returned %d", resp.StatusCode)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	totalBytes := resp.ContentLength
	var written int64
	buf := make([]byte, 32*1024)

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := out.Write(buf[:n])
			if writeErr != nil {
				return writeErr
			}
			written += int64(n)
			if totalBytes > 0 {
				pct := float64(written) / float64(totalBytes) * 100
				u.emitProgress("downloading", pct, fmt.Sprintf("Downloading... %.0f%%", pct))
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	return nil
}

func (u *Updater) verifyChecksum(filePath, assetName, checksumURL string) error {
	resp, err := http.Get(checksumURL)
	if err != nil {
		return fmt.Errorf("failed to download checksums: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	var expectedHash string
	for _, line := range strings.Split(string(body), "\n") {
		parts := strings.Fields(line)
		if len(parts) == 2 && parts[1] == assetName {
			expectedHash = parts[0]
			break
		}
	}

	if expectedHash == "" {
		// No checksum found for this asset — skip verification
		return nil
	}

	f, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}

	actualHash := hex.EncodeToString(h.Sum(nil))
	if actualHash != expectedHash {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedHash, actualHash)
	}

	return nil
}

func (u *Updater) getMacOSAppBundle() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	exe, _ = filepath.EvalSymlinks(exe)
	// Binary is at .app/Contents/MacOS/Binary — walk up 3 levels
	appDir := filepath.Dir(filepath.Dir(filepath.Dir(exe)))
	if strings.HasSuffix(appDir, ".app") {
		return appDir
	}
	return ""
}

func (u *Updater) applyMacOS(zipPath string) error {
	appBundle := u.getMacOSAppBundle()
	if appBundle == "" {
		return fmt.Errorf("could not determine .app bundle path")
	}

	parentDir := filepath.Dir(appBundle)
	oldBundle := appBundle + ".old"

	// Extract zip to temp dir first
	tmpExtract, err := os.MkdirTemp("", "mycel-extract-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpExtract)

	if err := unzipFile(zipPath, tmpExtract); err != nil {
		return fmt.Errorf("failed to extract update: %w", err)
	}

	// Find the .app inside the extracted contents
	var extractedApp string
	entries, _ := os.ReadDir(tmpExtract)
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".app") {
			extractedApp = filepath.Join(tmpExtract, e.Name())
			break
		}
	}
	if extractedApp == "" {
		return fmt.Errorf("no .app found in update archive")
	}

	// Atomic replace: rename current → .old, move new → current, remove .old
	os.RemoveAll(oldBundle) // clean up any previous .old
	if err := os.Rename(appBundle, oldBundle); err != nil {
		return fmt.Errorf("failed to move current app: %w", err)
	}

	newAppPath := filepath.Join(parentDir, filepath.Base(appBundle))
	if err := moveDir(extractedApp, newAppPath); err != nil {
		// Rollback
		os.Rename(oldBundle, appBundle)
		return fmt.Errorf("failed to install update: %w", err)
	}

	// Remove quarantine flag
	exec.Command("xattr", "-cr", newAppPath).Run()

	os.RemoveAll(oldBundle)
	return nil
}

func (u *Updater) applyLinux(binaryPath string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return err
	}

	oldPath := exe + ".old"
	os.Remove(oldPath)

	if err := os.Rename(exe, oldPath); err != nil {
		return fmt.Errorf("failed to move current binary: %w", err)
	}

	if err := copyFile(binaryPath, exe); err != nil {
		os.Rename(oldPath, exe) // rollback
		return fmt.Errorf("failed to install update: %w", err)
	}

	os.Chmod(exe, 0755)
	os.Remove(oldPath)
	return nil
}

func (u *Updater) applyWindows(exePath string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}

	oldPath := exe + ".old"
	os.Remove(oldPath)

	// Windows allows renaming a running executable
	if err := os.Rename(exe, oldPath); err != nil {
		return fmt.Errorf("failed to move current binary: %w", err)
	}

	if err := copyFile(exePath, exe); err != nil {
		os.Rename(oldPath, exe) // rollback
		return fmt.Errorf("failed to install update: %w", err)
	}

	// .old will be cleaned up on next startup
	return nil
}

// cleanupOldBinary removes leftover .old files from previous updates.
func (u *Updater) cleanupOldBinary() {
	exe, err := os.Executable()
	if err != nil {
		return
	}
	os.Remove(exe + ".old")

	// On macOS, also clean up .app.old
	if runtime.GOOS == "darwin" {
		appBundle := u.getMacOSAppBundle()
		if appBundle != "" {
			os.RemoveAll(appBundle + ".old")
		}
	}
}

// --- Helpers ---

func getAssetName() string {
	switch runtime.GOOS {
	case "darwin":
		return fmt.Sprintf("MycelStudio-darwin-%s.zip", runtime.GOARCH)
	case "linux":
		return fmt.Sprintf("MycelStudio-linux-%s", runtime.GOARCH)
	case "windows":
		return fmt.Sprintf("MycelStudio-windows-%s.exe", runtime.GOARCH)
	}
	return ""
}

func isNewer(latest, current string) bool {
	latestParts := strings.Split(latest, ".")
	currentParts := strings.Split(current, ".")

	maxLen := len(latestParts)
	if len(currentParts) > maxLen {
		maxLen = len(currentParts)
	}

	for i := 0; i < maxLen; i++ {
		l, c := 0, 0
		if i < len(latestParts) {
			l, _ = strconv.Atoi(latestParts[i])
		}
		if i < len(currentParts) {
			c, _ = strconv.Atoi(currentParts[i])
		}
		if l > c {
			return true
		}
		if l < c {
			return false
		}
	}
	return false
}

func truncateNotes(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func unzipFile(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		target := filepath.Join(dest, f.Name)

		// Prevent zip slip
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(dest)+string(os.PathSeparator)) {
			continue
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(target, f.Mode())
			continue
		}

		os.MkdirAll(filepath.Dir(target), 0755)
		outFile, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func moveDir(src, dst string) error {
	// Try rename first (same filesystem)
	if err := os.Rename(src, dst); err == nil {
		return nil
	}
	// Fallback: copy recursively using cp
	cmd := exec.Command("cp", "-R", src, dst)
	return cmd.Run()
}
