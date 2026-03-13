// Package models contains JSON-serializable types for the Studio API.
package models

// StudioProject represents a parsed Mycel project for the Studio frontend.
type StudioProject struct {
	Service     *ServiceConfig     `json:"service,omitempty"`
	Connectors  []ConnectorConfig  `json:"connectors"`
	Flows       []FlowConfig       `json:"flows"`
	Types       []TypeConfig       `json:"types"`
	Transforms  []TransformConfig  `json:"transforms"`
	Validators  []ValidatorConfig  `json:"validators"`
	Aspects     []AspectConfig     `json:"aspects"`
	NamedCaches []NamedCacheConfig `json:"namedCaches"`
}

// ServiceConfig represents the service block.
type ServiceConfig struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ConnectorConfig represents a connector block.
type ConnectorConfig struct {
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	Driver     string                 `json:"driver,omitempty"`
	SourceFile string                 `json:"sourceFile,omitempty"`
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// FlowConfig represents a flow block.
type FlowConfig struct {
	Name          string            `json:"name"`
	SourceFile    string            `json:"sourceFile,omitempty"`
	When          string            `json:"when,omitempty"`
	From          *FlowEndpoint     `json:"from,omitempty"`
	To            *FlowEndpoint     `json:"to,omitempty"`
	Transform     *TransformBlock   `json:"transform,omitempty"`
	Validate      *ValidateBlock    `json:"validate,omitempty"`
	Enrichments   []EnrichBlock     `json:"enrichments,omitempty"`
	Cache         *CacheBlock       `json:"cache,omitempty"`
	Lock          *LockBlock        `json:"lock,omitempty"`
	Semaphore     *SemaphoreBlock   `json:"semaphore,omitempty"`
	Coordinate    *CoordinateBlock  `json:"coordinate,omitempty"`
	Require       *RequireBlock     `json:"require,omitempty"`
	ErrorHandling *ErrorHandling    `json:"errorHandling,omitempty"`
}

// FlowEndpoint represents from/to blocks.
type FlowEndpoint struct {
	Connector string                 `json:"connector"`
	Operation string                 `json:"operation,omitempty"`
	Target    string                 `json:"target,omitempty"`
	Query     string                 `json:"query,omitempty"`
	Filter    string                 `json:"filter,omitempty"`
	Extra     map[string]interface{} `json:"extra,omitempty"`
}

// TransformBlock represents a transform block.
type TransformBlock struct {
	Use      []string          `json:"use,omitempty"`
	Mappings map[string]string `json:"mappings,omitempty"`
}

// ValidateBlock represents a validate block.
type ValidateBlock struct {
	Input  string `json:"input,omitempty"`
	Output string `json:"output,omitempty"`
}

// EnrichBlock represents an enrich block.
type EnrichBlock struct {
	Name      string            `json:"name"`
	Connector string            `json:"connector"`
	Operation string            `json:"operation"`
	Params    map[string]string `json:"params,omitempty"`
}

// CacheBlock represents a cache block.
type CacheBlock struct {
	Storage string `json:"storage"`
	Key     string `json:"key"`
	TTL     string `json:"ttl"`
}

// LockBlock represents a lock block.
type LockBlock struct {
	Storage string `json:"storage"`
	Key     string `json:"key"`
	Timeout string `json:"timeout"`
	Wait    bool   `json:"wait,omitempty"`
	Retry   string `json:"retry,omitempty"`
}

// SemaphoreBlock represents a semaphore block.
type SemaphoreBlock struct {
	Storage    string `json:"storage"`
	Key        string `json:"key"`
	MaxPermits int    `json:"maxPermits"`
	Timeout    string `json:"timeout"`
	Lease      string `json:"lease,omitempty"`
}

// CoordinateBlock represents a coordinate block.
type CoordinateBlock struct {
	Storage    string          `json:"storage"`
	Timeout    string          `json:"timeout"`
	OnTimeout  string          `json:"onTimeout,omitempty"`
	MaxRetries int             `json:"maxRetries,omitempty"`
	Wait       *WaitConfig     `json:"wait,omitempty"`
	Signal     *SignalConfig   `json:"signal,omitempty"`
	Preflight  *PreflightBlock `json:"preflight,omitempty"`
}

// WaitConfig represents a wait block inside coordinate.
type WaitConfig struct {
	When string `json:"when"`
	For  string `json:"for"`
}

// SignalConfig represents a signal block inside coordinate.
type SignalConfig struct {
	When string `json:"when"`
	Emit string `json:"emit"`
	TTL  string `json:"ttl,omitempty"`
}

// PreflightBlock represents a preflight block inside coordinate.
type PreflightBlock struct {
	Connector string            `json:"connector"`
	Query     string            `json:"query"`
	Params    map[string]string `json:"params,omitempty"`
	IfExists  string            `json:"ifExists,omitempty"`
}

// RequireBlock represents a require block.
type RequireBlock struct {
	Roles []string `json:"roles,omitempty"`
}

// ErrorHandling represents error_handling block.
type ErrorHandling struct {
	Retry *RetryConfig `json:"retry,omitempty"`
}

// RetryConfig represents retry configuration.
type RetryConfig struct {
	Attempts int    `json:"attempts"`
	Delay    string `json:"delay"`
	Backoff  string `json:"backoff,omitempty"`
}

// TypeConfig represents a type block.
type TypeConfig struct {
	Name       string                 `json:"name"`
	SourceFile string                 `json:"sourceFile,omitempty"`
	Fields     map[string]FieldConfig `json:"fields"`
}

// FieldConfig represents a field in a type.
type FieldConfig struct {
	Type        string                 `json:"type"`
	Required    bool                   `json:"required,omitempty"`
	Format      string                 `json:"format,omitempty"`
	Pattern     string                 `json:"pattern,omitempty"`
	Enum        []string               `json:"enum,omitempty"`
	Min         *float64               `json:"min,omitempty"`
	Max         *float64               `json:"max,omitempty"`
	MinLength   *int                   `json:"minLength,omitempty"`
	MaxLength   *int                   `json:"maxLength,omitempty"`
	Default     interface{}            `json:"default,omitempty"`
	Validate    string                 `json:"validate,omitempty"`
	Items       *FieldConfig           `json:"items,omitempty"`
	Fields      map[string]FieldConfig `json:"fields,omitempty"`
}

// TransformConfig represents a named transform block.
type TransformConfig struct {
	Name       string            `json:"name"`
	SourceFile string            `json:"sourceFile,omitempty"`
	Mappings   map[string]string `json:"mappings"`
}

// ValidatorConfig represents a validator block.
type ValidatorConfig struct {
	Name       string `json:"name"`
	SourceFile string `json:"sourceFile,omitempty"`
	Type       string `json:"type"` // regex, cel, wasm
	Pattern  string `json:"pattern,omitempty"`
	Expr     string `json:"expr,omitempty"`
	Module   string `json:"module,omitempty"`
	Function string `json:"function,omitempty"`
	Message  string `json:"message"`
}

// AspectConfig represents an aspect block.
type AspectConfig struct {
	Name       string                 `json:"name"`
	SourceFile string                 `json:"sourceFile,omitempty"`
	On         []string               `json:"on"`
	When       string                 `json:"when"` // before, after, around, on_error
	Condition  string                 `json:"condition,omitempty"`
	Priority   int                    `json:"priority,omitempty"`
	Action     *AspectAction          `json:"action,omitempty"`
	Cache      *CacheBlock            `json:"cache,omitempty"`
	Invalidate *AspectInvalidate      `json:"invalidate,omitempty"`
}

// AspectAction represents an action block inside aspect.
type AspectAction struct {
	Connector string            `json:"connector"`
	Target    string            `json:"target"`
	Transform map[string]string `json:"transform,omitempty"`
}

// AspectInvalidate represents an invalidate block inside aspect.
type AspectInvalidate struct {
	Storage  string   `json:"storage"`
	Keys     []string `json:"keys,omitempty"`
	Patterns []string `json:"patterns,omitempty"`
}

// NamedCacheConfig represents a named cache block.
type NamedCacheConfig struct {
	Name    string `json:"name"`
	Storage string `json:"storage"`
	Key     string `json:"key"`
	TTL     string `json:"ttl"`
}

// ParseFileEntry is a named file for multi-file parsing.
type ParseFileEntry struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// ParseRequest is the request body for /api/parse.
type ParseRequest struct {
	// Path to the project directory (for parsing all files)
	Path string `json:"path,omitempty"`
	// Content is raw HCL content (for parsing a single snippet)
	Content string `json:"content,omitempty"`
	// Files is an array of named HCL files (for multi-file parsing from browser)
	Files []ParseFileEntry `json:"files,omitempty"`
}

// ParseResponse is the response from /api/parse.
type ParseResponse struct {
	Success bool           `json:"success"`
	Project *StudioProject `json:"project,omitempty"`
	Errors  []ParseError   `json:"errors,omitempty"`
}

// ParseError represents a parsing error with location info.
type ParseError struct {
	Message  string `json:"message"`
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
	Column   int    `json:"column,omitempty"`
}
