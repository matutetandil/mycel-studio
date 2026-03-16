// Package handlers contains HTTP handlers for the Studio API.
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/mycel-studio/backend/models"
	"github.com/mycel-studio/backend/parser"
)

// HandleParse handles POST /api/parse requests.
// It parses HCL configuration and returns a JSON-friendly representation.
func HandleParse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ParseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendParseError(w, "Invalid request body: "+err.Error())
		return
	}

	// Validate request
	if req.Path == "" && req.Content == "" && len(req.Files) == 0 {
		sendParseError(w, "Either 'path', 'content', or 'files' must be provided")
		return
	}

	ctx := context.Background()
	hclParser := parser.NewParser()

	var config *parser.Configuration
	var err error

	if req.Path != "" {
		// Parse a directory or file
		info, statErr := os.Stat(req.Path)
		if statErr != nil {
			sendParseError(w, "Path not found: "+req.Path)
			return
		}

		if info.IsDir() {
			config, err = hclParser.Parse(ctx, req.Path)
		} else {
			config, err = hclParser.ParseFile(ctx, req.Path)
		}
	} else if len(req.Files) > 0 {
		// Parse multiple named files (from browser File System Access API)
		fileMap := make(map[string]string, len(req.Files))
		for _, f := range req.Files {
			fileMap[f.Path] = f.Content
		}
		config, err = hclParser.ParseMultipleFiles(ctx, fileMap)
	} else {
		// Parse inline content
		config, err = hclParser.ParseContent(ctx, req.Content, "inline.hcl")
	}

	if err != nil {
		// Parse the error to extract file/line info if possible
		parseErr := extractParseError(err)
		sendParseErrorWithDetails(w, parseErr)
		return
	}

	// Convert to Studio project model
	project := convertToStudioProject(config, req.Path)

	response := models.ParseResponse{
		Success: true,
		Project: project,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// convertToStudioProject converts a parser Configuration to a StudioProject.
func convertToStudioProject(config *parser.Configuration, basePath string) *models.StudioProject {
	project := &models.StudioProject{
		Connectors:  make([]models.ConnectorConfig, 0),
		Flows:       make([]models.FlowConfig, 0),
		Types:       make([]models.TypeConfig, 0),
		Transforms:  make([]models.TransformConfig, 0),
		Validators:  make([]models.ValidatorConfig, 0),
		Aspects:     make([]models.AspectConfig, 0),
		NamedCaches: make([]models.NamedCacheConfig, 0),
	}

	// Convert service config
	if config.Service != nil {
		project.Service = &models.ServiceConfig{
			Name:    config.Service.Name,
			Version: config.Service.Version,
		}
	}

	// Convert connectors
	for _, conn := range config.Connectors {
		project.Connectors = append(project.Connectors, models.ConnectorConfig{
			Name:       conn.Name,
			Type:       conn.Type,
			Driver:     conn.Driver,
			SourceFile: makeRelativePath(conn.SourceFile, basePath),
			Properties: conn.Properties,
		})
	}

	// Convert flows
	for _, flow := range config.Flows {
		flowConfig := models.FlowConfig{
			Name:       flow.Name,
			SourceFile: makeRelativePath(flow.SourceFile, basePath),
			When:       flow.When,
		}

		// Convert from
		if flow.From != nil {
			flowConfig.From = &models.FlowEndpoint{
				Connector: flow.From.Connector,
				Operation: flow.From.Operation,
			}
		}

		// Convert to
		if flow.To != nil {
			flowConfig.To = &models.FlowEndpoint{
				Connector: flow.To.Connector,
				Target:    flow.To.Target,
				Query:     flow.To.Query,
				Filter:    flow.To.Filter,
			}
		}

		// Convert transform
		if flow.Transform != nil {
			flowConfig.Transform = &models.TransformBlock{
				Mappings: flow.Transform.Mappings,
			}
			if flow.Transform.Use != "" {
				flowConfig.Transform.Use = strings.Split(flow.Transform.Use, ",")
			}
		}

		// Convert validate
		if flow.Validate != nil {
			flowConfig.Validate = &models.ValidateBlock{
				Input:  flow.Validate.Input,
				Output: flow.Validate.Output,
			}
		}

		// Convert enrichments
		for _, enrich := range flow.Enrichments {
			flowConfig.Enrichments = append(flowConfig.Enrichments, models.EnrichBlock{
				Name:      enrich.Name,
				Connector: enrich.Connector,
				Operation: enrich.Operation,
				Params:    enrich.Params,
			})
		}

		// Convert cache
		if flow.Cache != nil {
			flowConfig.Cache = &models.CacheBlock{
				Storage: flow.Cache.Storage,
				Key:     flow.Cache.Key,
				TTL:     flow.Cache.TTL,
			}
		}

		// Convert lock
		if flow.Lock != nil {
			flowConfig.Lock = &models.LockBlock{
				Storage: flow.Lock.Storage,
				Key:     flow.Lock.Key,
				Timeout: flow.Lock.Timeout,
				Wait:    flow.Lock.Wait,
				Retry:   flow.Lock.Retry,
			}
		}

		// Convert semaphore
		if flow.Semaphore != nil {
			flowConfig.Semaphore = &models.SemaphoreBlock{
				Storage:    flow.Semaphore.Storage,
				Key:        flow.Semaphore.Key,
				MaxPermits: flow.Semaphore.MaxPermits,
				Timeout:    flow.Semaphore.Timeout,
				Lease:      flow.Semaphore.Lease,
			}
		}

		// Convert coordinate
		if flow.Coordinate != nil {
			flowConfig.Coordinate = &models.CoordinateBlock{
				Storage:    flow.Coordinate.Storage,
				Timeout:    flow.Coordinate.Timeout,
				OnTimeout:  flow.Coordinate.OnTimeout,
				MaxRetries: flow.Coordinate.MaxRetries,
			}
			if flow.Coordinate.Wait != nil {
				flowConfig.Coordinate.Wait = &models.WaitConfig{
					When: flow.Coordinate.Wait.When,
					For:  flow.Coordinate.Wait.For,
				}
			}
			if flow.Coordinate.Signal != nil {
				flowConfig.Coordinate.Signal = &models.SignalConfig{
					When: flow.Coordinate.Signal.When,
					Emit: flow.Coordinate.Signal.Emit,
					TTL:  flow.Coordinate.Signal.TTL,
				}
			}
		}

		// Convert require
		if flow.Require != nil {
			flowConfig.Require = &models.RequireBlock{
				Roles: flow.Require.Roles,
			}
		}

		// Convert error handling
		if flow.ErrorHandling != nil && flow.ErrorHandling.Retry != nil {
			flowConfig.ErrorHandling = &models.ErrorHandling{
				Retry: &models.RetryConfig{
					Attempts: flow.ErrorHandling.Retry.Attempts,
					Delay:    flow.ErrorHandling.Retry.Delay,
					Backoff:  flow.ErrorHandling.Retry.Backoff,
				},
			}
		}

		project.Flows = append(project.Flows, flowConfig)
	}

	// Convert types
	for _, typ := range config.Types {
		typeConfig := models.TypeConfig{
			Name:       typ.Name,
			SourceFile: makeRelativePath(typ.SourceFile, basePath),
			Fields:     make(map[string]models.FieldConfig),
		}

		for fieldName, field := range typ.Fields {
			fieldConfig := models.FieldConfig{
				Type:     field.Type,
				Required: field.Required,
			}

			if field.ValidateRef != "" {
				fieldConfig.Validate = field.ValidateRef
			}

			typeConfig.Fields[fieldName] = fieldConfig
		}

		project.Types = append(project.Types, typeConfig)
	}

	// Convert transforms
	for _, tr := range config.Transforms {
		project.Transforms = append(project.Transforms, models.TransformConfig{
			Name:       tr.Name,
			SourceFile: makeRelativePath(tr.SourceFile, basePath),
			Mappings:   tr.Mappings,
		})
	}

	// Convert validators
	for _, val := range config.Validators {
		project.Validators = append(project.Validators, models.ValidatorConfig{
			Name:       val.Name,
			SourceFile: makeRelativePath(val.SourceFile, basePath),
			Type:       val.Type,
			Pattern:    val.Pattern,
			Expr:       val.Expr,
			Module:     val.Module,
			Function:   val.Entrypoint,
			Message:    val.Message,
		})
	}

	// Convert aspects
	for _, asp := range config.Aspects {
		aspectConfig := models.AspectConfig{
			Name:       asp.Name,
			SourceFile: makeRelativePath(asp.SourceFile, basePath),
			On:         asp.On,
			When:       asp.When,
			Condition:  asp.Condition,
			Priority:   asp.Priority,
		}

		if asp.Action != nil {
			aspectConfig.Action = &models.AspectAction{
				Connector: asp.Action.Connector,
				Flow:      asp.Action.Flow,
				Operation: asp.Action.Operation,
				Target:    asp.Action.Target,
				Transform: asp.Action.Transform,
			}
		}

		if asp.Cache != nil {
			aspectConfig.Cache = &models.CacheBlock{
				Storage: asp.Cache.Storage,
				Key:     asp.Cache.Key,
				TTL:     asp.Cache.TTL,
			}
		}

		if asp.Invalidate != nil {
			aspectConfig.Invalidate = &models.AspectInvalidate{
				Storage:  asp.Invalidate.Storage,
				Keys:     asp.Invalidate.Keys,
				Patterns: asp.Invalidate.Patterns,
			}
		}

		if asp.Response != nil {
			aspectConfig.Response = &models.AspectResponse{
				Headers: asp.Response.Headers,
				Fields:  asp.Response.Fields,
			}
		}

		project.Aspects = append(project.Aspects, aspectConfig)
	}

	// Convert named caches
	for _, cache := range config.NamedCaches {
		project.NamedCaches = append(project.NamedCaches, models.NamedCacheConfig{
			Name:    cache.Name,
			Storage: cache.Storage,
			Key:     cache.Key,
			TTL:     cache.TTL,
		})
	}

	return project
}

// makeRelativePath makes a path relative to basePath if possible.
func makeRelativePath(path, basePath string) string {
	if basePath == "" || path == "" {
		return path
	}
	rel, err := filepath.Rel(basePath, path)
	if err != nil {
		return path
	}
	return rel
}

// extractParseError extracts structured error info from a parse error.
func extractParseError(err error) models.ParseError {
	// Try to extract line/column info from error message
	// Format is typically: "file.hcl:10,15-20: error message"
	errStr := err.Error()

	parseErr := models.ParseError{
		Message: errStr,
	}

	// Try to parse HCL error format
	if colonIdx := strings.Index(errStr, ":"); colonIdx > 0 {
		filePart := errStr[:colonIdx]
		if strings.HasSuffix(filePart, ".hcl") {
			parseErr.File = filePart
		}
	}

	return parseErr
}

// sendParseError sends a simple error response.
func sendParseError(w http.ResponseWriter, message string) {
	sendParseErrorWithDetails(w, models.ParseError{Message: message})
}

// sendParseErrorWithDetails sends an error response with details.
func sendParseErrorWithDetails(w http.ResponseWriter, parseErr models.ParseError) {
	response := models.ParseResponse{
		Success: false,
		Errors:  []models.ParseError{parseErr},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(response)
}
