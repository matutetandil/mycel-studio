// Package handlers contains HTTP handlers for the Studio API.
package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"mycel-studio/models"
)

// GenerateRequest is the request body for /api/generate.
type GenerateRequest struct {
	Project *models.StudioProject `json:"project"`
	// Options for generation
	SingleFile bool `json:"singleFile,omitempty"` // Generate all in one file vs separate files
}

// GenerateResponse is the response from /api/generate.
type GenerateResponse struct {
	Success bool            `json:"success"`
	Files   []GeneratedFile `json:"files,omitempty"`
	Error   string          `json:"error,omitempty"`
}

// GeneratedFile represents a generated HCL file.
type GeneratedFile struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

// HandleGenerate handles POST /api/generate requests.
// It converts a StudioProject to HCL files.
func HandleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendGenerateError(w, "Invalid request body: "+err.Error())
		return
	}

	if req.Project == nil {
		sendGenerateError(w, "Project is required")
		return
	}

	var files []GeneratedFile
	var err error

	if req.SingleFile {
		files, err = generateSingleFile(req.Project)
	} else {
		files, err = generateMultipleFiles(req.Project)
	}

	if err != nil {
		sendGenerateError(w, err.Error())
		return
	}

	response := GenerateResponse{
		Success: true,
		Files:   files,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DoGenerate is the core generate logic, usable from both HTTP handlers and Wails bindings.
func DoGenerate(reqJSON []byte) (*GenerateResponse, error) {
	var req GenerateRequest
	if err := json.Unmarshal(reqJSON, &req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	if req.Project == nil {
		return &GenerateResponse{Success: false, Error: "Project is required"}, nil
	}

	var files []GeneratedFile
	var err error

	if req.SingleFile {
		files, err = generateSingleFile(req.Project)
	} else {
		files, err = generateMultipleFiles(req.Project)
	}

	if err != nil {
		return &GenerateResponse{Success: false, Error: err.Error()}, nil
	}

	return &GenerateResponse{Success: true, Files: files}, nil
}

// generateSingleFile generates all HCL in a single file.
func generateSingleFile(project *models.StudioProject) ([]GeneratedFile, error) {
	var buf bytes.Buffer

	// Service block
	if project.Service != nil {
		writeServiceBlock(&buf, project.Service)
		buf.WriteString("\n")
	}

	// Connectors
	for _, conn := range project.Connectors {
		writeConnectorBlock(&buf, &conn)
		buf.WriteString("\n")
	}

	// Flows
	for _, flow := range project.Flows {
		writeFlowBlock(&buf, &flow)
		buf.WriteString("\n")
	}

	// Types
	for _, typ := range project.Types {
		writeTypeBlock(&buf, &typ)
		buf.WriteString("\n")
	}

	// Transforms
	for _, tr := range project.Transforms {
		writeTransformBlock(&buf, &tr)
		buf.WriteString("\n")
	}

	// Validators
	for _, val := range project.Validators {
		writeValidatorBlock(&buf, &val)
		buf.WriteString("\n")
	}

	// Aspects
	for _, asp := range project.Aspects {
		writeAspectBlock(&buf, &asp)
		buf.WriteString("\n")
	}

	// Named caches
	for _, cache := range project.NamedCaches {
		writeNamedCacheBlock(&buf, &cache)
		buf.WriteString("\n")
	}

	return []GeneratedFile{
		{Name: "config.hcl", Content: strings.TrimSpace(buf.String())},
	}, nil
}

// generateMultipleFiles generates HCL in separate files by category.
func generateMultipleFiles(project *models.StudioProject) ([]GeneratedFile, error) {
	var files []GeneratedFile

	// Service config
	if project.Service != nil {
		var buf bytes.Buffer
		writeServiceBlock(&buf, project.Service)
		files = append(files, GeneratedFile{
			Name:    "config.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Connectors
	if len(project.Connectors) > 0 {
		var buf bytes.Buffer
		for i, conn := range project.Connectors {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeConnectorBlock(&buf, &conn)
		}
		files = append(files, GeneratedFile{
			Name:    "connectors.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Flows
	if len(project.Flows) > 0 {
		var buf bytes.Buffer
		for i, flow := range project.Flows {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeFlowBlock(&buf, &flow)
		}
		files = append(files, GeneratedFile{
			Name:    "flows.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Types
	if len(project.Types) > 0 {
		var buf bytes.Buffer
		for i, typ := range project.Types {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeTypeBlock(&buf, &typ)
		}
		files = append(files, GeneratedFile{
			Name:    "types.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Transforms
	if len(project.Transforms) > 0 {
		var buf bytes.Buffer
		for i, tr := range project.Transforms {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeTransformBlock(&buf, &tr)
		}
		files = append(files, GeneratedFile{
			Name:    "transforms.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Validators
	if len(project.Validators) > 0 {
		var buf bytes.Buffer
		for i, val := range project.Validators {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeValidatorBlock(&buf, &val)
		}
		files = append(files, GeneratedFile{
			Name:    "validators.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Aspects
	if len(project.Aspects) > 0 {
		var buf bytes.Buffer
		for i, asp := range project.Aspects {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeAspectBlock(&buf, &asp)
		}
		files = append(files, GeneratedFile{
			Name:    "aspects.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	// Named caches
	if len(project.NamedCaches) > 0 {
		var buf bytes.Buffer
		for i, cache := range project.NamedCaches {
			if i > 0 {
				buf.WriteString("\n")
			}
			writeNamedCacheBlock(&buf, &cache)
		}
		files = append(files, GeneratedFile{
			Name:    "caches.hcl",
			Content: strings.TrimSpace(buf.String()),
		})
	}

	return files, nil
}

// HCL generation helpers

func writeServiceBlock(buf *bytes.Buffer, svc *models.ServiceConfig) {
	buf.WriteString("service {\n")
	if svc.Name != "" {
		buf.WriteString(fmt.Sprintf("  name    = %q\n", svc.Name))
	}
	if svc.Version != "" {
		buf.WriteString(fmt.Sprintf("  version = %q\n", svc.Version))
	}
	buf.WriteString("}\n")
}

func writeConnectorBlock(buf *bytes.Buffer, conn *models.ConnectorConfig) {
	buf.WriteString(fmt.Sprintf("connector %q {\n", conn.Name))

	if conn.Type != "" {
		buf.WriteString(fmt.Sprintf("  type = %q\n", conn.Type))
	}
	if conn.Driver != "" {
		buf.WriteString(fmt.Sprintf("  driver = %q\n", conn.Driver))
	}

	// Write properties in sorted order for deterministic output
	if len(conn.Properties) > 0 {
		keys := make([]string, 0, len(conn.Properties))
		for k := range conn.Properties {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		for _, k := range keys {
			writeAttribute(buf, "  ", k, conn.Properties[k])
		}
	}

	buf.WriteString("}\n")
}

func writeFlowBlock(buf *bytes.Buffer, flow *models.FlowConfig) {
	buf.WriteString(fmt.Sprintf("flow %q {\n", flow.Name))

	if flow.When != "" {
		buf.WriteString(fmt.Sprintf("  when = %q\n", flow.When))
	}

	// From block
	if flow.From != nil {
		buf.WriteString("\n  from {\n")
		if flow.From.Connector != "" {
			buf.WriteString(fmt.Sprintf("    connector = %q\n", flow.From.Connector))
		}
		if flow.From.Operation != "" {
			buf.WriteString(fmt.Sprintf("    operation = %q\n", flow.From.Operation))
		}
		buf.WriteString("  }\n")
	}

	// Transform block
	if flow.Transform != nil && (len(flow.Transform.Use) > 0 || len(flow.Transform.Mappings) > 0) {
		buf.WriteString("\n  transform {\n")
		if len(flow.Transform.Use) > 0 {
			buf.WriteString(fmt.Sprintf("    use = %q\n", strings.Join(flow.Transform.Use, ",")))
		}
		if len(flow.Transform.Mappings) > 0 {
			keys := sortedKeys(flow.Transform.Mappings)
			for _, k := range keys {
				buf.WriteString(fmt.Sprintf("    %s = %q\n", k, flow.Transform.Mappings[k]))
			}
		}
		buf.WriteString("  }\n")
	}

	// Validate block
	if flow.Validate != nil && (flow.Validate.Input != "" || flow.Validate.Output != "") {
		buf.WriteString("\n  validate {\n")
		if flow.Validate.Input != "" {
			buf.WriteString(fmt.Sprintf("    input  = %q\n", flow.Validate.Input))
		}
		if flow.Validate.Output != "" {
			buf.WriteString(fmt.Sprintf("    output = %q\n", flow.Validate.Output))
		}
		buf.WriteString("  }\n")
	}

	// Enrichments
	for _, enrich := range flow.Enrichments {
		buf.WriteString(fmt.Sprintf("\n  enrich %q {\n", enrich.Name))
		if enrich.Connector != "" {
			buf.WriteString(fmt.Sprintf("    connector = %q\n", enrich.Connector))
		}
		if enrich.Operation != "" {
			buf.WriteString(fmt.Sprintf("    operation = %q\n", enrich.Operation))
		}
		if len(enrich.Params) > 0 {
			keys := sortedKeys(enrich.Params)
			for _, k := range keys {
				buf.WriteString(fmt.Sprintf("    %s = %q\n", k, enrich.Params[k]))
			}
		}
		buf.WriteString("  }\n")
	}

	// To block
	if flow.To != nil {
		buf.WriteString("\n  to {\n")
		if flow.To.Connector != "" {
			buf.WriteString(fmt.Sprintf("    connector = %q\n", flow.To.Connector))
		}
		if flow.To.Target != "" {
			buf.WriteString(fmt.Sprintf("    target    = %q\n", flow.To.Target))
		}
		if flow.To.Query != "" {
			buf.WriteString(fmt.Sprintf("    query     = %q\n", flow.To.Query))
		}
		if flow.To.Filter != "" {
			buf.WriteString(fmt.Sprintf("    filter    = %q\n", flow.To.Filter))
		}
		buf.WriteString("  }\n")
	}

	// Cache block
	if flow.Cache != nil {
		buf.WriteString("\n  cache {\n")
		if flow.Cache.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage = %q\n", flow.Cache.Storage))
		}
		if flow.Cache.Key != "" {
			buf.WriteString(fmt.Sprintf("    key     = %q\n", flow.Cache.Key))
		}
		if flow.Cache.TTL != "" {
			buf.WriteString(fmt.Sprintf("    ttl     = %q\n", flow.Cache.TTL))
		}
		buf.WriteString("  }\n")
	}

	// Lock block
	if flow.Lock != nil {
		buf.WriteString("\n  lock {\n")
		if flow.Lock.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage = %q\n", flow.Lock.Storage))
		}
		if flow.Lock.Key != "" {
			buf.WriteString(fmt.Sprintf("    key     = %q\n", flow.Lock.Key))
		}
		if flow.Lock.Timeout != "" {
			buf.WriteString(fmt.Sprintf("    timeout = %q\n", flow.Lock.Timeout))
		}
		if flow.Lock.Wait {
			buf.WriteString("    wait    = true\n")
		}
		if flow.Lock.Retry != "" {
			buf.WriteString(fmt.Sprintf("    retry   = %q\n", flow.Lock.Retry))
		}
		buf.WriteString("  }\n")
	}

	// Semaphore block
	if flow.Semaphore != nil {
		buf.WriteString("\n  semaphore {\n")
		if flow.Semaphore.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage     = %q\n", flow.Semaphore.Storage))
		}
		if flow.Semaphore.Key != "" {
			buf.WriteString(fmt.Sprintf("    key         = %q\n", flow.Semaphore.Key))
		}
		if flow.Semaphore.MaxPermits > 0 {
			buf.WriteString(fmt.Sprintf("    max_permits = %d\n", flow.Semaphore.MaxPermits))
		}
		if flow.Semaphore.Timeout != "" {
			buf.WriteString(fmt.Sprintf("    timeout     = %q\n", flow.Semaphore.Timeout))
		}
		if flow.Semaphore.Lease != "" {
			buf.WriteString(fmt.Sprintf("    lease       = %q\n", flow.Semaphore.Lease))
		}
		buf.WriteString("  }\n")
	}

	// Coordinate block
	if flow.Coordinate != nil {
		buf.WriteString("\n  coordinate {\n")
		if flow.Coordinate.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage = %q\n", flow.Coordinate.Storage))
		}
		if flow.Coordinate.Timeout != "" {
			buf.WriteString(fmt.Sprintf("    timeout = %q\n", flow.Coordinate.Timeout))
		}
		if flow.Coordinate.OnTimeout != "" {
			buf.WriteString(fmt.Sprintf("    on_timeout = %q\n", flow.Coordinate.OnTimeout))
		}
		if flow.Coordinate.MaxRetries > 0 {
			buf.WriteString(fmt.Sprintf("    max_retries = %d\n", flow.Coordinate.MaxRetries))
		}
		if flow.Coordinate.Wait != nil {
			buf.WriteString("\n    wait {\n")
			if flow.Coordinate.Wait.When != "" {
				buf.WriteString(fmt.Sprintf("      when = %q\n", flow.Coordinate.Wait.When))
			}
			if flow.Coordinate.Wait.For != "" {
				buf.WriteString(fmt.Sprintf("      for  = %q\n", flow.Coordinate.Wait.For))
			}
			buf.WriteString("    }\n")
		}
		if flow.Coordinate.Signal != nil {
			buf.WriteString("\n    signal {\n")
			if flow.Coordinate.Signal.When != "" {
				buf.WriteString(fmt.Sprintf("      when = %q\n", flow.Coordinate.Signal.When))
			}
			if flow.Coordinate.Signal.Emit != "" {
				buf.WriteString(fmt.Sprintf("      emit = %q\n", flow.Coordinate.Signal.Emit))
			}
			if flow.Coordinate.Signal.TTL != "" {
				buf.WriteString(fmt.Sprintf("      ttl  = %q\n", flow.Coordinate.Signal.TTL))
			}
			buf.WriteString("    }\n")
		}
		buf.WriteString("  }\n")
	}

	// Require block
	if flow.Require != nil && len(flow.Require.Roles) > 0 {
		buf.WriteString("\n  require {\n")
		buf.WriteString("    roles = [")
		for i, role := range flow.Require.Roles {
			if i > 0 {
				buf.WriteString(", ")
			}
			buf.WriteString(fmt.Sprintf("%q", role))
		}
		buf.WriteString("]\n")
		buf.WriteString("  }\n")
	}

	// Error handling block
	if flow.ErrorHandling != nil && flow.ErrorHandling.Retry != nil {
		buf.WriteString("\n  error_handling {\n")
		buf.WriteString("    retry {\n")
		if flow.ErrorHandling.Retry.Attempts > 0 {
			buf.WriteString(fmt.Sprintf("      attempts = %d\n", flow.ErrorHandling.Retry.Attempts))
		}
		if flow.ErrorHandling.Retry.Delay != "" {
			buf.WriteString(fmt.Sprintf("      delay    = %q\n", flow.ErrorHandling.Retry.Delay))
		}
		if flow.ErrorHandling.Retry.Backoff != "" {
			buf.WriteString(fmt.Sprintf("      backoff  = %q\n", flow.ErrorHandling.Retry.Backoff))
		}
		buf.WriteString("    }\n")
		buf.WriteString("  }\n")
	}

	buf.WriteString("}\n")
}

func writeTypeBlock(buf *bytes.Buffer, typ *models.TypeConfig) {
	buf.WriteString(fmt.Sprintf("type %q {\n", typ.Name))

	// Sort fields for deterministic output
	keys := make([]string, 0, len(typ.Fields))
	for k := range typ.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, fieldName := range keys {
		field := typ.Fields[fieldName]
		// Simple field definition
		buf.WriteString(fmt.Sprintf("  %s = %s", fieldName, field.Type))
		if field.Required {
			// Required is default, no annotation needed
		}
		buf.WriteString("\n")
	}

	buf.WriteString("}\n")
}

func writeTransformBlock(buf *bytes.Buffer, tr *models.TransformConfig) {
	buf.WriteString(fmt.Sprintf("transform %q {\n", tr.Name))

	keys := sortedKeys(tr.Mappings)
	for _, k := range keys {
		buf.WriteString(fmt.Sprintf("  %s = %q\n", k, tr.Mappings[k]))
	}

	buf.WriteString("}\n")
}

func writeValidatorBlock(buf *bytes.Buffer, val *models.ValidatorConfig) {
	buf.WriteString(fmt.Sprintf("validator %q {\n", val.Name))

	if val.Type != "" {
		buf.WriteString(fmt.Sprintf("  type = %q\n", val.Type))
	}
	if val.Pattern != "" {
		buf.WriteString(fmt.Sprintf("  pattern = %q\n", val.Pattern))
	}
	if val.Expr != "" {
		buf.WriteString(fmt.Sprintf("  expr = %q\n", val.Expr))
	}
	if val.Module != "" {
		buf.WriteString(fmt.Sprintf("  module = %q\n", val.Module))
	}
	if val.Function != "" {
		buf.WriteString(fmt.Sprintf("  entrypoint = %q\n", val.Function))
	}
	if val.Message != "" {
		buf.WriteString(fmt.Sprintf("  message = %q\n", val.Message))
	}

	buf.WriteString("}\n")
}

func writeAspectBlock(buf *bytes.Buffer, asp *models.AspectConfig) {
	buf.WriteString(fmt.Sprintf("aspect %q {\n", asp.Name))

	if len(asp.On) > 0 {
		buf.WriteString("  on = [")
		for i, pattern := range asp.On {
			if i > 0 {
				buf.WriteString(", ")
			}
			buf.WriteString(fmt.Sprintf("%q", pattern))
		}
		buf.WriteString("]\n")
	}

	if asp.When != "" {
		buf.WriteString(fmt.Sprintf("  when = %q\n", asp.When))
	}
	if asp.Condition != "" {
		buf.WriteString(fmt.Sprintf("  if = %q\n", asp.Condition))
	}
	if asp.Priority != 0 {
		buf.WriteString(fmt.Sprintf("  priority = %d\n", asp.Priority))
	}

	// Action block
	if asp.Action != nil {
		buf.WriteString("\n  action {\n")
		if asp.Action.Connector != "" {
			buf.WriteString(fmt.Sprintf("    connector = %q\n", asp.Action.Connector))
		}
		if asp.Action.Target != "" {
			buf.WriteString(fmt.Sprintf("    target = %q\n", asp.Action.Target))
		}
		if len(asp.Action.Transform) > 0 {
			keys := sortedKeys(asp.Action.Transform)
			for _, k := range keys {
				buf.WriteString(fmt.Sprintf("    %s = %q\n", k, asp.Action.Transform[k]))
			}
		}
		buf.WriteString("  }\n")
	}

	// Cache block
	if asp.Cache != nil {
		buf.WriteString("\n  cache {\n")
		if asp.Cache.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage = %q\n", asp.Cache.Storage))
		}
		if asp.Cache.Key != "" {
			buf.WriteString(fmt.Sprintf("    key = %q\n", asp.Cache.Key))
		}
		if asp.Cache.TTL != "" {
			buf.WriteString(fmt.Sprintf("    ttl = %q\n", asp.Cache.TTL))
		}
		buf.WriteString("  }\n")
	}

	// Invalidate block
	if asp.Invalidate != nil {
		buf.WriteString("\n  invalidate {\n")
		if asp.Invalidate.Storage != "" {
			buf.WriteString(fmt.Sprintf("    storage = %q\n", asp.Invalidate.Storage))
		}
		if len(asp.Invalidate.Keys) > 0 {
			buf.WriteString("    keys = [")
			for i, key := range asp.Invalidate.Keys {
				if i > 0 {
					buf.WriteString(", ")
				}
				buf.WriteString(fmt.Sprintf("%q", key))
			}
			buf.WriteString("]\n")
		}
		if len(asp.Invalidate.Patterns) > 0 {
			buf.WriteString("    patterns = [")
			for i, pattern := range asp.Invalidate.Patterns {
				if i > 0 {
					buf.WriteString(", ")
				}
				buf.WriteString(fmt.Sprintf("%q", pattern))
			}
			buf.WriteString("]\n")
		}
		buf.WriteString("  }\n")
	}

	buf.WriteString("}\n")
}

func writeNamedCacheBlock(buf *bytes.Buffer, cache *models.NamedCacheConfig) {
	buf.WriteString(fmt.Sprintf("cache %q {\n", cache.Name))

	if cache.Storage != "" {
		buf.WriteString(fmt.Sprintf("  storage = %q\n", cache.Storage))
	}
	if cache.Key != "" {
		buf.WriteString(fmt.Sprintf("  key = %q\n", cache.Key))
	}
	if cache.TTL != "" {
		buf.WriteString(fmt.Sprintf("  ttl = %q\n", cache.TTL))
	}

	buf.WriteString("}\n")
}

// Helper functions

func writeAttribute(buf *bytes.Buffer, indent, key string, value interface{}) {
	switch v := value.(type) {
	case string:
		buf.WriteString(fmt.Sprintf("%s%s = %q\n", indent, key, v))
	case float64:
		// Check if it's a whole number
		if v == float64(int(v)) {
			buf.WriteString(fmt.Sprintf("%s%s = %d\n", indent, key, int(v)))
		} else {
			buf.WriteString(fmt.Sprintf("%s%s = %g\n", indent, key, v))
		}
	case bool:
		buf.WriteString(fmt.Sprintf("%s%s = %t\n", indent, key, v))
	case []interface{}:
		buf.WriteString(fmt.Sprintf("%s%s = [", indent, key))
		for i, item := range v {
			if i > 0 {
				buf.WriteString(", ")
			}
			switch elem := item.(type) {
			case string:
				buf.WriteString(fmt.Sprintf("%q", elem))
			default:
				buf.WriteString(fmt.Sprintf("%v", elem))
			}
		}
		buf.WriteString("]\n")
	default:
		buf.WriteString(fmt.Sprintf("%s%s = %v\n", indent, key, v))
	}
}

func sortedKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func sendGenerateError(w http.ResponseWriter, message string) {
	response := GenerateResponse{
		Success: false,
		Error:   message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(response)
}
