package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"mycel-studio/handlers"
	"mycel-studio/models"
	studioparser "mycel-studio/parser"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds application state and provides Wails bindings.
type App struct {
	ctx            context.Context
	parser         *studioparser.Parser
	ptyManager     *PTYManager
	debugClient    *DebugClient
	updater        *Updater
	confirmOnClose bool
	skipCloseConfirm bool
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{
		parser:         studioparser.NewParser(),
		ptyManager:     NewPTYManager(),
		updater:        NewUpdater(version),
		confirmOnClose: true,
	}
}

// Startup is called when the Wails app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.ptyManager.SetApp(a)
	a.updater.app = a
	a.updater.cleanupOldBinary()

	// Check for updates periodically (first check after 5s, then every 4 hours)
	// Auto-downloads and installs silently; frontend only sees "restart now/later"
	go func() {
		time.Sleep(5 * time.Second)
		for {
			a.updater.CheckAndAutoInstall()
			time.Sleep(4 * time.Hour)
		}
	}()
}

// SetConfirmOnClose updates the confirm-on-close preference from the frontend.
func (a *App) SetConfirmOnClose(enabled bool) {
	a.confirmOnClose = enabled
}

// BeforeClose is called when the user tries to close the app.
// It emits a before-close event for workspace save, then shows a confirmation dialog if enabled.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	// Notify frontend to save workspace state (terminal CWDs, window layout, etc.)
	wailsRuntime.EventsEmit(a.ctx, "app:before-close")
	// Small delay to let the frontend save
	time.Sleep(500 * time.Millisecond)

	if !a.confirmOnClose || a.skipCloseConfirm {
		return false
	}

	result, err := wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
		Type:          wailsRuntime.QuestionDialog,
		Title:         "Quit Mycel Studio?",
		Message:       "Are you sure you want to quit?\n\nYou can disable this in Settings.",
		DefaultButton: "Yes",
		Buttons:       []string{"Yes", "No"},
	})
	if err != nil {
		return false
	}
	return result == "No"
}

// Shutdown is called when the Wails app is closing.
func (a *App) Shutdown(ctx context.Context) {
	a.ptyManager.Shutdown()
	if a.debugClient != nil {
		a.debugClient.Disconnect()
	}
}

// CreateTerminal spawns a new terminal session and returns its ID.
// workDir sets the initial working directory for the shell.
func (a *App) CreateTerminal(cols, rows int, workDir string) (string, error) {
	return a.ptyManager.CreateTerminal(cols, rows, workDir)
}

// WriteTerminal sends input data to a terminal session.
func (a *App) WriteTerminal(id string, data string) error {
	return a.ptyManager.WriteTerminal(id, data)
}

// ResizeTerminal changes the terminal size.
func (a *App) ResizeTerminal(id string, cols, rows int) error {
	return a.ptyManager.ResizeTerminal(id, cols, rows)
}

// CloseTerminal kills a terminal session.
func (a *App) CloseTerminal(id string) error {
	return a.ptyManager.CloseTerminal(id)
}

// GetTerminalCwd returns the current working directory of a terminal session.
func (a *App) GetTerminalCwd(id string) string {
	return a.ptyManager.GetTerminalCwd(id)
}

// ParseHCL parses HCL content or files and returns a studio project as JSON.
func (a *App) ParseHCL(reqJSON string) (string, error) {
	var req models.ParseRequest
	if err := json.Unmarshal([]byte(reqJSON), &req); err != nil {
		return "", fmt.Errorf("invalid request: %w", err)
	}

	resp, err := handlers.DoParse(&req)
	if err != nil {
		return "", err
	}

	out, err := json.Marshal(resp)
	if err != nil {
		return "", fmt.Errorf("failed to marshal response: %w", err)
	}
	return string(out), nil
}

// GenerateHCL generates HCL from a studio project.
// Note: The frontend already generates HCL client-side via hclGenerator.ts.
// This binding is only used for canvas→HCL sync when no project is open.
func (a *App) GenerateHCL(reqJSON string) (string, error) {
	resp, err := handlers.DoGenerate([]byte(reqJSON))
	if err != nil {
		return "", err
	}
	out, err := json.Marshal(resp)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// ValidateHCL validates HCL content and returns validation results as JSON.
func (a *App) ValidateHCL(hcl string, filename string) string {
	if filename == "" {
		filename = "config.hcl"
	}

	errors := a.parser.ValidateContent(hcl, filename)

	type valResp struct {
		Valid  bool                            `json:"valid"`
		Errors []studioparser.ValidationError `json:"errors,omitempty"`
	}

	resp := valResp{
		Valid:  len(errors) == 0,
		Errors: errors,
	}

	if len(hcl) == 0 {
		resp.Valid = false
		resp.Errors = append(resp.Errors, studioparser.ValidationError{
			Message:  "HCL configuration is empty",
			Severity: "error",
		})
	}

	out, _ := json.Marshal(resp)
	return string(out)
}

// GetWindowSize returns the current window width and height.
func (a *App) GetWindowSize() map[string]int {
	w, h := wailsRuntime.WindowGetSize(a.ctx)
	return map[string]int{"width": w, "height": h}
}

// SetWindowSize sets the window width and height.
func (a *App) SetWindowSize(width, height int) {
	wailsRuntime.WindowSetSize(a.ctx, width, height)
}

// GetWindowPosition returns the current window x and y coordinates.
func (a *App) GetWindowPosition() map[string]int {
	x, y := wailsRuntime.WindowGetPosition(a.ctx)
	return map[string]int{"x": x, "y": y}
}

// SetWindowPosition sets the window x and y coordinates.
func (a *App) SetWindowPosition(x, y int) {
	wailsRuntime.WindowSetPosition(a.ctx, x, y)
}

// ShowConfirmDialog shows a native confirmation dialog and returns the user's choice.
func (a *App) ShowConfirmDialog(title, message string) (string, error) {
	result, err := wailsRuntime.MessageDialog(a.ctx, wailsRuntime.MessageDialogOptions{
		Type:          wailsRuntime.QuestionDialog,
		Title:         title,
		Message:       message,
		DefaultButton: "Yes",
		CancelButton:  "No",
	})
	if err != nil {
		return "No", err
	}
	return result, nil
}
