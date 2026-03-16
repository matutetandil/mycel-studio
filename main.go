package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Mycel Studio",
		Width:     1440,
		Height:    900,
		MinWidth:  1024,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:       app.buildMenu(),
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			TitleBar: mac.TitleBarDefault(),
			About: &mac.AboutInfo{
				Title:   "Mycel Studio v1.1.0",
				Message: "Visual editor for Mycel microservice configurations.\n\nDesign your data pipelines visually, generate production-ready HCL, and debug them in real time.\n\nSupport: https://buymeacoffee.com/matutetandil",
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
