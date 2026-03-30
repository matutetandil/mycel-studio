package main

import (
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// buildMenu creates the native macOS application menu.
// Menu actions emit events to the frontend via Wails runtime.
func (a *App) buildMenu() *menu.Menu {
	appMenu := menu.NewMenu()

	// macOS App menu — standard role (About, Hide, Unhide, Quit)
	appMenu.Append(menu.AppMenu())

	// File menu
	fileMenu := appMenu.AddSubmenu("File")
	fileMenu.AddText("New Project...", keys.Combo("n", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:new-project")
	})
	fileMenu.AddText("New from Template...", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:new-template")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Open Project...", keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:open-project")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Save All", keys.CmdOrCtrl("s"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:save-project")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Close Project", nil, func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:close-project")
	})

	// Edit menu — include standard macOS edit role + custom items
	appMenu.Append(menu.EditMenu())

	// Custom Edit submenu items (undo/redo/copy/paste are handled by EditMenu role)
	editMenu := appMenu.AddSubmenu("Studio")
	editMenu.AddText("Undo", keys.Combo("z", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		// Cmd+Shift+Z for app-level undo (not text undo)
		wailsRuntime.EventsEmit(a.ctx, "menu:undo")
	})
	editMenu.AddText("Redo", keys.Combo("z", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:redo")
	})
	editMenu.AddSeparator()
	editMenu.AddText("Duplicate Node", keys.CmdOrCtrl("d"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:duplicate")
	})

	// View menu
	viewMenu := appMenu.AddSubmenu("View")
	modeMenu := viewMenu.AddSubmenu("Mode")
	modeMenu.AddText("Visual First", nil, func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:set-view-mode", "visual-first")
	})
	modeMenu.AddText("Text First", nil, func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:set-view-mode", "text-first")
	})
	viewMenu.AddSeparator()
	viewMenu.AddText("Toggle Dark Mode", nil, func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:toggle-theme")
	})
	viewMenu.AddSeparator()
	viewMenu.AddText("Toggle Editor Panel", keys.CmdOrCtrl("j"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:toggle-editor")
	})
	viewMenu.AddText("Toggle Terminal", keys.CmdOrCtrl("`"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:toggle-terminal")
	})
	viewMenu.AddSeparator()
	viewMenu.AddText("Settings...", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:show-settings")
	})

	// Help menu
	helpMenu := appMenu.AddSubmenu("Help")
	helpMenu.AddText("Keyboard Shortcuts", keys.CmdOrCtrl("/"), func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:show-shortcuts")
	})
	helpMenu.AddSeparator()
	helpMenu.AddText("Check for Updates...", nil, func(_ *menu.CallbackData) {
		wailsRuntime.EventsEmit(a.ctx, "menu:check-updates")
	})
	helpMenu.AddSeparator()
	if a.IsCLIInstalled() {
		helpMenu.AddText("Uninstall 'mycel-studio' Command", nil, func(_ *menu.CallbackData) {
			if err := a.UninstallCLI(); err != nil {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "error", "message": "Failed to uninstall CLI: " + err.Error()})
			} else if !a.IsCLIInstalled() {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "success", "message": "'mycel-studio' command removed from PATH"})
			} else {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "error", "message": "Failed to remove 'mycel-studio' — file still exists"})
			}
		})
	} else {
		helpMenu.AddText("Install 'mycel-studio' Command in PATH...", nil, func(_ *menu.CallbackData) {
			path, err := a.InstallCLI()
			if err != nil {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "error", "message": "Failed to install CLI: " + err.Error()})
			} else if a.IsCLIInstalled() {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "success", "message": "'mycel-studio' command installed at " + path})
			} else {
				wailsRuntime.EventsEmit(a.ctx, "notification", map[string]string{"type": "error", "message": "Install command ran but 'mycel-studio' was not found at " + path})
			}
		})
	}
	helpMenu.AddSeparator()
	helpMenu.AddText("Documentation", nil, func(_ *menu.CallbackData) {
		wailsRuntime.BrowserOpenURL(a.ctx, "https://github.com/mycelframework/mycel")
	})

	return appMenu
}
