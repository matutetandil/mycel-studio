// cmd/server is the HTTP server entry point for Docker deployment.
// It serves the React frontend as static files and exposes the API endpoints.
// Usage: MYCEL_MODE=server go run ./cmd/server
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"mycel-studio/handlers"
	studioparser "mycel-studio/parser"

	"github.com/rs/cors"
)

type ValidateRequest struct {
	HCL      string            `json:"hcl"`
	Files    map[string]string `json:"files,omitempty"`
	Filename string            `json:"filename,omitempty"`
}

type ValidateResponse struct {
	Valid  bool                          `json:"valid"`
	Errors []studioparser.ValidationError `json:"errors,omitempty"`
}

func main() {
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/api/validate", handleValidate)
	mux.HandleFunc("/api/parse", handlers.HandleParse)
	mux.HandleFunc("/api/generate", handlers.HandleGenerate)
	mux.HandleFunc("/api/templates", handleTemplates)

	// Serve static files in production
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./static"
	}

	if _, err := os.Stat(staticDir); err == nil {
		fs := http.FileServer(http.Dir(staticDir))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := staticDir + r.URL.Path
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, staticDir+"/index.html")
				return
			}
			fs.ServeHTTP(w, r)
		})
		log.Printf("Serving static files from %s", staticDir)
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Mycel Studio server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func handleValidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	p := studioparser.NewParser()

	if len(req.Files) > 0 {
		var allErrors []studioparser.ValidationError
		for filename, content := range req.Files {
			errs := p.ValidateContent(content, filename)
			allErrors = append(allErrors, errs...)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ValidateResponse{Valid: len(allErrors) == 0, Errors: allErrors})
		return
	}

	filename := req.Filename
	if filename == "" {
		filename = "config.mycel"
	}

	errors := p.ValidateContent(req.HCL, filename)
	resp := ValidateResponse{Valid: len(errors) == 0, Errors: errors}

	if len(req.HCL) == 0 {
		resp.Valid = false
		resp.Errors = append(resp.Errors, studioparser.ValidationError{
			Message:  "HCL configuration is empty",
			Severity: "error",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	type Template struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		HCL         string `json:"hcl"`
	}

	templates := []Template{
		{
			ID:          "rest-db",
			Name:        "REST API + Database",
			Description: "Simple REST API with SQLite database",
			HCL:         "connector \"api\" {\n  type = \"rest\"\n  port = 3000\n}\n",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}
