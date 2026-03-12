package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/mycel-studio/backend/handlers"
	studioparser "github.com/mycel-studio/backend/parser"
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

type Template struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	HCL         string `json:"hcl"`
}

func main() {
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/health", handleHealth)
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
			// Serve index.html for SPA routes
			path := staticDir + r.URL.Path
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, staticDir+"/index.html")
				return
			}
			fs.ServeHTTP(w, r)
		})
		log.Printf("Serving static files from %s", staticDir)
	}

	// CORS middleware
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

	log.Printf("Backend server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
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
		// Validate multiple files
		var allErrors []studioparser.ValidationError
		for filename, content := range req.Files {
			errs := p.ValidateContent(content, filename)
			allErrors = append(allErrors, errs...)
		}
		response := ValidateResponse{
			Valid:  len(allErrors) == 0,
			Errors: allErrors,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Validate single HCL content
	filename := req.Filename
	if filename == "" {
		filename = "config.hcl"
	}

	validationErrors := p.ValidateContent(req.HCL, filename)
	response := ValidateResponse{
		Valid:  len(validationErrors) == 0,
		Errors: validationErrors,
	}

	if len(req.HCL) == 0 {
		response.Valid = false
		response.Errors = append(response.Errors, studioparser.ValidationError{
			Message:  "HCL configuration is empty",
			Severity: "error",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleTemplates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	templates := []Template{
		{
			ID:          "rest-db",
			Name:        "REST API + Database",
			Description: "Simple REST API with SQLite database",
			HCL: `connector "api" {
  type = "rest"
  port = 3000
}

connector "db" {
  type     = "database"
  driver   = "sqlite"
  database = "./data/app.db"
}

flow "get_items" {
  from {
    connector = "api"
    operation = "GET /items"
  }

  to {
    connector = "db"
    target    = "items"
  }
}

flow "create_item" {
  from {
    connector = "api"
    operation = "POST /items"
  }

  transform {
    id         = "uuid()"
    created_at = "now()"
  }

  to {
    connector = "db"
    target    = "items"
  }
}`,
		},
		{
			ID:          "api-queue",
			Name:        "API + Message Queue",
			Description: "REST API that publishes to RabbitMQ",
			HCL: `connector "api" {
  type = "rest"
  port = 3000
}

connector "queue" {
  type   = "mq"
  driver = "rabbitmq"
  queue  = "events"
}

flow "publish_event" {
  from {
    connector = "api"
    operation = "POST /events"
  }

  transform {
    event_id  = "uuid()"
    timestamp = "now()"
  }

  to {
    connector = "queue"
  }
}`,
		},
		{
			ID:          "grpc-cache",
			Name:        "gRPC + Redis Cache",
			Description: "gRPC service with Redis caching",
			HCL: `connector "grpc" {
  type       = "grpc"
  port       = 50051
  proto_path = "./proto/service.proto"
}

connector "cache" {
  type   = "cache"
  driver = "redis"
}

flow "get_cached" {
  from {
    connector = "grpc"
    operation = "GetItem"
  }

  to {
    connector = "cache"
    target    = "items"
  }
}`,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}
