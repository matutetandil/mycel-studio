// Package parser provides HCL parsing for Mycel Studio.
// This is a standalone parser that doesn't depend on the Mycel runtime.
package parser

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclparse"
	"github.com/zclconf/go-cty/cty"
)

// Parser parses Mycel HCL configuration files.
type Parser struct {
	hclParser *hclparse.Parser
	evalCtx   *hcl.EvalContext
}

// NewParser creates a new HCL parser.
func NewParser() *Parser {
	return &Parser{
		hclParser: hclparse.NewParser(),
		evalCtx:   &hcl.EvalContext{},
	}
}

// Configuration holds all parsed configuration.
type Configuration struct {
	Service     *ServiceConfig
	Connectors  []*ConnectorConfig
	Flows       []*FlowConfig
	Types       []*TypeConfig
	Transforms  []*TransformConfig
	Validators  []*ValidatorConfig
	Aspects     []*AspectConfig
	NamedCaches []*NamedCacheConfig
}

// ServiceConfig holds service-level configuration.
type ServiceConfig struct {
	Name    string
	Version string
}

// ConnectorConfig represents a connector block.
type ConnectorConfig struct {
	Name       string
	Type       string
	Driver     string
	SourceFile string
	Properties map[string]interface{}
}

// FlowConfig represents a flow block.
type FlowConfig struct {
	Name          string
	SourceFile    string
	When          string
	From          *EndpointConfig
	To            *EndpointConfig
	Transform     *TransformBlockConfig
	Validate      *ValidateBlockConfig
	Enrichments   []*EnrichConfig
	Cache         *CacheBlockConfig
	Lock          *LockConfig
	Semaphore     *SemaphoreConfig
	Coordinate    *CoordinateConfig
	Require       *RequireConfig
	ErrorHandling *ErrorHandlingConfig
}

// EndpointConfig represents from/to blocks.
type EndpointConfig struct {
	Connector   string
	Operation   string
	Target      string
	Query       string
	Filter      string
	Format      string
	Exchange    string
	QueryFilter map[string]string
	Update      map[string]string
	Params      map[string]string
}

// TransformBlockConfig represents transform block in a flow.
type TransformBlockConfig struct {
	Use      string
	Mappings map[string]string
}

// ValidateBlockConfig represents validate block in a flow.
type ValidateBlockConfig struct {
	Input  string
	Output string
}

// EnrichConfig represents enrich block.
type EnrichConfig struct {
	Name      string
	Connector string
	Operation string
	Params    map[string]string
}

// CacheBlockConfig represents cache block.
type CacheBlockConfig struct {
	Storage string
	Key     string
	TTL     string
}

// LockConfig represents lock block.
type LockConfig struct {
	Storage string
	Key     string
	Timeout string
	Wait    bool
	Retry   string
}

// SemaphoreConfig represents semaphore block.
type SemaphoreConfig struct {
	Storage    string
	Key        string
	MaxPermits int
	Timeout    string
	Lease      string
}

// CoordinateConfig represents coordinate block.
type CoordinateConfig struct {
	Storage    string
	Timeout    string
	OnTimeout  string
	MaxRetries int
	Wait       *WaitConfig
	Signal     *SignalConfig
}

// WaitConfig represents wait block inside coordinate.
type WaitConfig struct {
	When string
	For  string
}

// SignalConfig represents signal block inside coordinate.
type SignalConfig struct {
	When string
	Emit string
	TTL  string
}

// RequireConfig represents require block.
type RequireConfig struct {
	Roles []string
}

// ErrorHandlingConfig represents error_handling block.
type ErrorHandlingConfig struct {
	Retry *RetryConfig
}

// RetryConfig represents retry configuration.
type RetryConfig struct {
	Attempts int
	Delay    string
	Backoff  string
}

// TypeConfig represents a type block.
type TypeConfig struct {
	Name       string
	SourceFile string
	Fields     map[string]*FieldConfig
}

// FieldConfig represents a field in a type.
type FieldConfig struct {
	Type        string
	Required    bool
	Format      string
	Pattern     string
	Enum        []string
	Min         *float64
	Max         *float64
	MinLength   *int
	MaxLength   *int
	Default     interface{}
	ValidateRef string
}

// TransformConfig represents a named transform block.
type TransformConfig struct {
	Name       string
	SourceFile string
	Mappings   map[string]string
}

// ValidatorConfig represents a validator block.
type ValidatorConfig struct {
	Name       string
	SourceFile string
	Type       string
	Pattern    string
	Expr       string
	Module     string
	Entrypoint string
	Message    string
}

// AspectConfig represents an aspect block.
type AspectConfig struct {
	Name       string
	SourceFile string
	On         []string
	When       string
	Condition  string
	Priority   int
	Action     *AspectActionConfig
	Cache      *CacheBlockConfig
	Invalidate *InvalidateConfig
	Response   *AspectResponseConfig
}

// AspectActionConfig represents action block in aspect.
type AspectActionConfig struct {
	Connector string
	Flow      string
	Operation string
	Target    string
	Transform map[string]string
}

// AspectResponseConfig represents response block in aspect (v1.13.0).
type AspectResponseConfig struct {
	Headers map[string]string
	Fields  map[string]string
}

// InvalidateConfig represents invalidate block.
type InvalidateConfig struct {
	Storage  string
	Keys     []string
	Patterns []string
}

// NamedCacheConfig represents a cache block.
type NamedCacheConfig struct {
	Name    string
	Storage string
	Key     string
	TTL     string
}

// Parse parses all HCL files in the given directory recursively.
func (p *Parser) Parse(ctx context.Context, configDir string) (*Configuration, error) {
	config := &Configuration{
		Connectors:  make([]*ConnectorConfig, 0),
		Flows:       make([]*FlowConfig, 0),
		Types:       make([]*TypeConfig, 0),
		Transforms:  make([]*TransformConfig, 0),
		Validators:  make([]*ValidatorConfig, 0),
		Aspects:     make([]*AspectConfig, 0),
		NamedCaches: make([]*NamedCacheConfig, 0),
	}

	err := filepath.Walk(configDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() || !strings.HasSuffix(info.Name(), ".hcl") {
			return nil
		}

		fileConfig, err := p.ParseFile(ctx, path)
		if err != nil {
			return fmt.Errorf("failed to parse %s: %w", path, err)
		}

		mergeConfig(config, fileConfig)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return config, nil
}

// ParseFile parses a single HCL file.
func (p *Parser) ParseFile(ctx context.Context, path string) (*Configuration, error) {
	file, diags := p.hclParser.ParseHCLFile(path)
	if diags.HasErrors() {
		return nil, fmt.Errorf("HCL parse error: %s", diags.Error())
	}

	config := &Configuration{
		Connectors:  make([]*ConnectorConfig, 0),
		Flows:       make([]*FlowConfig, 0),
		Types:       make([]*TypeConfig, 0),
		Transforms:  make([]*TransformConfig, 0),
		Validators:  make([]*ValidatorConfig, 0),
		Aspects:     make([]*AspectConfig, 0),
		NamedCaches: make([]*NamedCacheConfig, 0),
	}

	content, diags := file.Body.Content(rootSchema())
	if diags.HasErrors() {
		return nil, fmt.Errorf("HCL content error: %s", diags.Error())
	}

	for _, block := range content.Blocks {
		switch block.Type {
		case "service":
			svc, err := p.parseServiceBlock(block)
			if err != nil {
				return nil, fmt.Errorf("service block error: %w", err)
			}
			config.Service = svc

		case "connector":
			conn, err := p.parseConnectorBlock(block)
			if err != nil {
				return nil, fmt.Errorf("connector block error: %w", err)
			}
			config.Connectors = append(config.Connectors, conn)

		case "flow":
			flow, err := p.parseFlowBlock(block, path)
			if err != nil {
				return nil, fmt.Errorf("flow block error: %w", err)
			}
			config.Flows = append(config.Flows, flow)

		case "type":
			typ, err := p.parseTypeBlock(block)
			if err != nil {
				return nil, fmt.Errorf("type block error: %w", err)
			}
			config.Types = append(config.Types, typ)

		case "transform":
			tr, err := p.parseTransformBlock(block)
			if err != nil {
				return nil, fmt.Errorf("transform block error: %w", err)
			}
			config.Transforms = append(config.Transforms, tr)

		case "validator":
			val, err := p.parseValidatorBlock(block)
			if err != nil {
				return nil, fmt.Errorf("validator block error: %w", err)
			}
			config.Validators = append(config.Validators, val)

		case "aspect":
			asp, err := p.parseAspectBlock(block)
			if err != nil {
				return nil, fmt.Errorf("aspect block error: %w", err)
			}
			config.Aspects = append(config.Aspects, asp)

		case "cache":
			cache, err := p.parseNamedCacheBlock(block)
			if err != nil {
				return nil, fmt.Errorf("cache block error: %w", err)
			}
			config.NamedCaches = append(config.NamedCaches, cache)
		}
	}

	return config, nil
}

// ParseMultipleFiles parses multiple named HCL files and merges the results.
// Each file is parsed with its own filename so that SourceFile tracking works correctly.
func (p *Parser) ParseMultipleFiles(ctx context.Context, files map[string]string) (*Configuration, error) {
	merged := &Configuration{
		Connectors:  make([]*ConnectorConfig, 0),
		Flows:       make([]*FlowConfig, 0),
		Types:       make([]*TypeConfig, 0),
		Transforms:  make([]*TransformConfig, 0),
		Validators:  make([]*ValidatorConfig, 0),
		Aspects:     make([]*AspectConfig, 0),
		NamedCaches: make([]*NamedCacheConfig, 0),
	}

	for filename, content := range files {
		config, err := p.ParseContent(ctx, content, filename)
		if err != nil {
			return nil, fmt.Errorf("error in %s: %w", filename, err)
		}
		// Merge
		if config.Service != nil && merged.Service == nil {
			merged.Service = config.Service
		}
		merged.Connectors = append(merged.Connectors, config.Connectors...)
		merged.Flows = append(merged.Flows, config.Flows...)
		merged.Types = append(merged.Types, config.Types...)
		merged.Transforms = append(merged.Transforms, config.Transforms...)
		merged.Validators = append(merged.Validators, config.Validators...)
		merged.Aspects = append(merged.Aspects, config.Aspects...)
		merged.NamedCaches = append(merged.NamedCaches, config.NamedCaches...)
	}

	return merged, nil
}

// ParseContent parses HCL content from a string.
func (p *Parser) ParseContent(ctx context.Context, content string, filename string) (*Configuration, error) {
	srcBytes := []byte(content)
	sourceCache[filename] = srcBytes
	file, diags := p.hclParser.ParseHCL(srcBytes, filename)
	if diags.HasErrors() {
		return nil, fmt.Errorf("HCL parse error: %s", diags.Error())
	}

	config := &Configuration{
		Connectors:  make([]*ConnectorConfig, 0),
		Flows:       make([]*FlowConfig, 0),
		Types:       make([]*TypeConfig, 0),
		Transforms:  make([]*TransformConfig, 0),
		Validators:  make([]*ValidatorConfig, 0),
		Aspects:     make([]*AspectConfig, 0),
		NamedCaches: make([]*NamedCacheConfig, 0),
	}

	bodyContent, diags := file.Body.Content(rootSchema())
	if diags.HasErrors() {
		return nil, fmt.Errorf("HCL content error: %s", diags.Error())
	}

	for _, block := range bodyContent.Blocks {
		switch block.Type {
		case "service":
			svc, err := p.parseServiceBlock(block)
			if err != nil {
				return nil, fmt.Errorf("service block error: %w", err)
			}
			config.Service = svc

		case "connector":
			conn, err := p.parseConnectorBlock(block)
			if err != nil {
				return nil, fmt.Errorf("connector block error: %w", err)
			}
			config.Connectors = append(config.Connectors, conn)

		case "flow":
			flow, err := p.parseFlowBlock(block, filename)
			if err != nil {
				return nil, fmt.Errorf("flow block error: %w", err)
			}
			config.Flows = append(config.Flows, flow)

		case "type":
			typ, err := p.parseTypeBlock(block)
			if err != nil {
				return nil, fmt.Errorf("type block error: %w", err)
			}
			config.Types = append(config.Types, typ)

		case "transform":
			tr, err := p.parseTransformBlock(block)
			if err != nil {
				return nil, fmt.Errorf("transform block error: %w", err)
			}
			config.Transforms = append(config.Transforms, tr)

		case "validator":
			val, err := p.parseValidatorBlock(block)
			if err != nil {
				return nil, fmt.Errorf("validator block error: %w", err)
			}
			config.Validators = append(config.Validators, val)

		case "aspect":
			asp, err := p.parseAspectBlock(block)
			if err != nil {
				return nil, fmt.Errorf("aspect block error: %w", err)
			}
			config.Aspects = append(config.Aspects, asp)

		case "cache":
			cache, err := p.parseNamedCacheBlock(block)
			if err != nil {
				return nil, fmt.Errorf("cache block error: %w", err)
			}
			config.NamedCaches = append(config.NamedCaches, cache)
		}
	}

	return config, nil
}

// ValidationError represents a validation error with location info.
type ValidationError struct {
	Message  string `json:"message"`
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
	Column   int    `json:"column,omitempty"`
	Severity string `json:"severity"` // "error" or "warning"
}

// ValidateContent parses HCL and returns structured validation errors.
func (p *Parser) ValidateContent(content string, filename string) []ValidationError {
	var errors []ValidationError

	// Step 1: Syntax validation
	file, diags := p.hclParser.ParseHCL([]byte(content), filename)
	if diags.HasErrors() {
		for _, d := range diags {
			ve := ValidationError{
				Message:  d.Detail,
				File:     filename,
				Severity: "error",
			}
			if d.Subject != nil {
				ve.Line = d.Subject.Start.Line
				ve.Column = d.Subject.Start.Column
			}
			if ve.Message == "" {
				ve.Message = d.Summary
			}
			errors = append(errors, ve)
		}
		return errors
	}

	// Step 2: Structure validation
	bodyContent, diags := file.Body.Content(rootSchema())
	if diags.HasErrors() {
		for _, d := range diags {
			ve := ValidationError{
				Message:  d.Detail,
				File:     filename,
				Severity: "error",
			}
			if d.Subject != nil {
				ve.Line = d.Subject.Start.Line
				ve.Column = d.Subject.Start.Column
			}
			if ve.Message == "" {
				ve.Message = d.Summary
			}
			errors = append(errors, ve)
		}
		return errors
	}

	// Step 3: Semantic validation
	connectorNames := make(map[string]bool)
	flowNames := make(map[string]bool)
	typeNames := make(map[string]bool)
	transformNames := make(map[string]bool)
	aspectNames := make(map[string]bool)
	validatorNames := make(map[string]bool)
	sagaNames := make(map[string]bool)
	stateMachineNames := make(map[string]bool)
	var referencedConnectors []struct {
		name string
		line int
	}

	// Helper for checking duplicate named blocks
	checkDuplicate := func(namesMap map[string]bool, blockType, name string, line int) {
		if namesMap[name] {
			errors = append(errors, ValidationError{
				Message:  fmt.Sprintf("Duplicate %s name: %q", blockType, name),
				File:     filename,
				Line:     line,
				Severity: "error",
			})
		}
		namesMap[name] = true
	}

	for _, block := range bodyContent.Blocks {
		switch block.Type {
		case "connector":
			if len(block.Labels) > 0 {
				name := block.Labels[0]
				checkDuplicate(connectorNames, "connector", name, block.DefRange.Start.Line)

				// Check for required 'type' attribute
				attrs, _ := block.Body.JustAttributes()
				if _, ok := attrs["type"]; !ok {
					errors = append(errors, ValidationError{
						Message:  fmt.Sprintf("Connector %q is missing required attribute \"type\"", name),
						File:     filename,
						Line:     block.DefRange.Start.Line,
						Severity: "error",
					})
				}
			}

		case "flow":
			if len(block.Labels) > 0 {
				name := block.Labels[0]
				checkDuplicate(flowNames, "flow", name, block.DefRange.Start.Line)

				// Check flow has 'from' block
				flowContent, fdiags := block.Body.Content(&hcl.BodySchema{
					Attributes: []hcl.AttributeSchema{
						{Name: "when"},
					},
					Blocks: []hcl.BlockHeaderSchema{
						{Type: "from"},
						{Type: "accept"},
						{Type: "to"},
						{Type: "transform"},
						{Type: "response"},
						{Type: "step", LabelNames: []string{"name"}},
						{Type: "validate"},
						{Type: "cache"},
						{Type: "lock"},
						{Type: "semaphore"},
						{Type: "dedupe"},
						{Type: "error_handling"},
						{Type: "batch"},
					},
				})
				if fdiags.HasErrors() {
					for _, d := range fdiags {
						ve := ValidationError{Message: d.Summary, File: filename, Severity: "warning"}
						if d.Subject != nil {
							ve.Line = d.Subject.Start.Line
						}
						errors = append(errors, ve)
					}
				} else {
					hasFrom := false
					for _, fb := range flowContent.Blocks {
						if fb.Type == "from" {
							hasFrom = true
							// Check connector reference
							attrs, _ := fb.Body.JustAttributes()
							if attr, ok := attrs["connector"]; ok {
								val, _ := attr.Expr.Value(p.evalCtx)
								if val.Type() == cty.String {
									referencedConnectors = append(referencedConnectors, struct {
										name string
										line int
									}{val.AsString(), attr.Range.Start.Line})
								}
							}
						}
						if fb.Type == "to" {
							attrs, _ := fb.Body.JustAttributes()
							if attr, ok := attrs["connector"]; ok {
								val, _ := attr.Expr.Value(p.evalCtx)
								if val.Type() == cty.String {
									referencedConnectors = append(referencedConnectors, struct {
										name string
										line int
									}{val.AsString(), attr.Range.Start.Line})
								}
							}
						}
					}
					if !hasFrom {
						errors = append(errors, ValidationError{
							Message:  fmt.Sprintf("Flow %q is missing required \"from\" block", name),
							File:     filename,
							Line:     block.DefRange.Start.Line,
							Severity: "error",
						})
					}
				}
			}

		case "type":
			if len(block.Labels) > 0 {
				checkDuplicate(typeNames, "type", block.Labels[0], block.DefRange.Start.Line)
			}
		case "transform":
			if len(block.Labels) > 0 {
				checkDuplicate(transformNames, "transform", block.Labels[0], block.DefRange.Start.Line)
			}
		case "aspect":
			if len(block.Labels) > 0 {
				checkDuplicate(aspectNames, "aspect", block.Labels[0], block.DefRange.Start.Line)
			}
		case "validator":
			if len(block.Labels) > 0 {
				checkDuplicate(validatorNames, "validator", block.Labels[0], block.DefRange.Start.Line)
			}
		case "saga":
			if len(block.Labels) > 0 {
				checkDuplicate(sagaNames, "saga", block.Labels[0], block.DefRange.Start.Line)
			}
		case "state_machine":
			if len(block.Labels) > 0 {
				checkDuplicate(stateMachineNames, "state_machine", block.Labels[0], block.DefRange.Start.Line)
			}
		}
	}

	// Check connector references
	for _, ref := range referencedConnectors {
		if !connectorNames[ref.name] {
			errors = append(errors, ValidationError{
				Message:  fmt.Sprintf("Referenced connector %q is not defined", ref.name),
				File:     filename,
				Line:     ref.line,
				Severity: "warning",
			})
		}
	}

	return errors
}

func rootSchema() *hcl.BodySchema {
	return &hcl.BodySchema{
		Blocks: []hcl.BlockHeaderSchema{
			{Type: "service"},
			{Type: "connector", LabelNames: []string{"name"}},
			{Type: "flow", LabelNames: []string{"name"}},
			{Type: "type", LabelNames: []string{"name"}},
			{Type: "transform", LabelNames: []string{"name"}},
			{Type: "validator", LabelNames: []string{"name"}},
			{Type: "aspect", LabelNames: []string{"name"}},
			{Type: "cache", LabelNames: []string{"name"}},
			{Type: "saga", LabelNames: []string{"name"}},
			{Type: "state_machine", LabelNames: []string{"name"}},
			{Type: "auth"},
			{Type: "security"},
			{Type: "plugin", LabelNames: []string{"name"}},
			{Type: "workflow"},
			{Type: "batch", LabelNames: []string{"name"}},
			{Type: "environment", LabelNames: []string{"name"}},
		},
	}
}

func (p *Parser) parseServiceBlock(block *hcl.Block) (*ServiceConfig, error) {
	config := &ServiceConfig{}

	content, diags := block.Body.Content(&hcl.BodySchema{
		Attributes: []hcl.AttributeSchema{
			{Name: "name"},
			{Name: "version"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("service content error: %s", diags.Error())
	}

	if attr, ok := content.Attributes["name"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() == cty.String {
			config.Name = val.AsString()
		}
	}

	if attr, ok := content.Attributes["version"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() == cty.String {
			config.Version = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseConnectorBlock(block *hcl.Block) (*ConnectorConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("connector block requires a name label")
	}

	// Extract source file from the block's DefRange
	sourceFile := block.DefRange.Filename

	config := &ConnectorConfig{
		Name:       block.Labels[0],
		SourceFile: sourceFile,
		Properties: make(map[string]interface{}),
	}

	// Use PartialContent to get known attributes while allowing unknown blocks
	partialContent, remain, diags := block.Body.PartialContent(&hcl.BodySchema{
		Attributes: []hcl.AttributeSchema{
			{Name: "type"},
			{Name: "driver"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("connector attributes error: %s", diags.Error())
	}

	// Extract type and driver
	if attr, ok := partialContent.Attributes["type"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() == cty.String {
			config.Type = val.AsString()
		}
	}
	if attr, ok := partialContent.Attributes["driver"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() == cty.String {
			config.Driver = val.AsString()
		}
	}

	// Get remaining attributes (all other fields)
	remainAttrs, _ := remain.JustAttributes()
	for name, attr := range remainAttrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.IsKnown() && val.Type() != cty.DynamicPseudoType {
			config.Properties[name] = ctyToGo(val)
		} else {
			// Dynamic value (e.g. env()) — extract source expression text
			config.Properties[name] = extractExprSource(attr.Expr)
		}
	}

	// Parse sub-blocks (pool, cors, tls, consumer, producer, etc.) into properties
	remainContent, _, _ := remain.PartialContent(&hcl.BodySchema{})
	_ = remainContent // already got attrs above

	// Re-parse remaining body to find blocks
	// Use a broad schema to capture common sub-block types
	subBlockTypes := []string{
		"pool", "cors", "tls", "retry", "consumer", "producer", "publisher",
		"exchange", "dlq", "sasl", "schema_registry", "profile",
	}
	subSchema := &hcl.BodySchema{}
	for _, bt := range subBlockTypes {
		subSchema.Blocks = append(subSchema.Blocks, hcl.BlockHeaderSchema{Type: bt})
	}
	subContent, _, _ := block.Body.PartialContent(subSchema)
	for _, subBlock := range subContent.Blocks {
		subAttrs, _ := subBlock.Body.JustAttributes()
		subProps := make(map[string]interface{})
		for k, a := range subAttrs {
			v, _ := a.Expr.Value(p.evalCtx)
			if v.IsKnown() && v.Type() != cty.DynamicPseudoType {
				subProps[k] = ctyToGo(v)
			} else {
				subProps[k] = extractExprSource(a.Expr)
			}
		}
		config.Properties[subBlock.Type] = subProps
	}

	return config, nil
}

func (p *Parser) parseFlowBlock(block *hcl.Block, sourceFile string) (*FlowConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("flow block requires a name label")
	}

	config := &FlowConfig{
		Name:        block.Labels[0],
		SourceFile:  sourceFile,
		Enrichments: make([]*EnrichConfig, 0),
	}

	content, diags := block.Body.Content(&hcl.BodySchema{
		Attributes: []hcl.AttributeSchema{
			{Name: "when"},
			{Name: "cache"},
		},
		Blocks: []hcl.BlockHeaderSchema{
			{Type: "from"},
			{Type: "to"},
			{Type: "transform"},
			{Type: "validate"},
			{Type: "enrich", LabelNames: []string{"name"}},
			{Type: "cache"},
			{Type: "lock"},
			{Type: "semaphore"},
			{Type: "coordinate"},
			{Type: "require"},
			{Type: "error_handling"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("flow content error: %s", diags.Error())
	}

	// Parse attributes
	if attr, ok := content.Attributes["when"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() == cty.String {
			config.When = val.AsString()
		}
	}

	// Parse nested blocks
	for _, nested := range content.Blocks {
		switch nested.Type {
		case "from":
			from, err := p.parseEndpointBlock(nested)
			if err != nil {
				return nil, err
			}
			config.From = from

		case "to":
			to, err := p.parseEndpointBlock(nested)
			if err != nil {
				return nil, err
			}
			config.To = to

		case "transform":
			tr, err := p.parseFlowTransformBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Transform = tr

		case "validate":
			val, err := p.parseFlowValidateBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Validate = val

		case "enrich":
			enrich, err := p.parseEnrichBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Enrichments = append(config.Enrichments, enrich)

		case "cache":
			cache, err := p.parseFlowCacheBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Cache = cache

		case "lock":
			lock, err := p.parseLockBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Lock = lock

		case "semaphore":
			sem, err := p.parseSemaphoreBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Semaphore = sem

		case "coordinate":
			coord, err := p.parseCoordinateBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Coordinate = coord

		case "require":
			req, err := p.parseRequireBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Require = req

		case "error_handling":
			eh, err := p.parseErrorHandlingBlock(nested)
			if err != nil {
				return nil, err
			}
			config.ErrorHandling = eh
		}
	}

	return config, nil
}

func (p *Parser) parseEndpointBlock(block *hcl.Block) (*EndpointConfig, error) {
	config := &EndpointConfig{}

	attrs, diags := block.Body.JustAttributes()
	if diags.HasErrors() {
		return nil, fmt.Errorf("endpoint attributes error: %s", diags.Error())
	}

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)

		// Handle map-type attributes (params, query_filter, update)
		if val.Type().IsObjectType() || val.Type().IsMapType() {
			m := make(map[string]string)
			for k, v := range val.AsValueMap() {
				if v.Type() == cty.String {
					m[k] = v.AsString()
				} else {
					m[k] = v.GoString()
				}
			}
			switch name {
			case "params":
				config.Params = m
			case "query_filter":
				config.QueryFilter = m
			case "update":
				config.Update = m
			}
			continue
		}

		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "connector":
			config.Connector = val.AsString()
		case "operation":
			config.Operation = val.AsString()
		case "target":
			config.Target = val.AsString()
		case "query":
			config.Query = val.AsString()
		case "filter":
			config.Filter = val.AsString()
		case "format":
			config.Format = val.AsString()
		case "exchange":
			config.Exchange = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseFlowTransformBlock(block *hcl.Block) (*TransformBlockConfig, error) {
	config := &TransformBlockConfig{
		Mappings: make(map[string]string),
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if name == "use" {
			if val.Type() == cty.String {
				config.Use = val.AsString()
			}
		} else {
			// Treat as mapping - store the expression source
			config.Mappings[name] = exprToString(attr.Expr)
		}
	}

	return config, nil
}

func (p *Parser) parseFlowValidateBlock(block *hcl.Block) (*ValidateBlockConfig, error) {
	config := &ValidateBlockConfig{}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "input":
			config.Input = val.AsString()
		case "output":
			config.Output = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseEnrichBlock(block *hcl.Block) (*EnrichConfig, error) {
	config := &EnrichConfig{
		Params: make(map[string]string),
	}

	if len(block.Labels) > 0 {
		config.Name = block.Labels[0]
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "connector":
			config.Connector = val.AsString()
		case "operation":
			config.Operation = val.AsString()
		default:
			config.Params[name] = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseFlowCacheBlock(block *hcl.Block) (*CacheBlockConfig, error) {
	config := &CacheBlockConfig{}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "storage":
			config.Storage = val.AsString()
		case "key":
			config.Key = val.AsString()
		case "ttl":
			config.TTL = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseLockBlock(block *hcl.Block) (*LockConfig, error) {
	config := &LockConfig{}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		switch name {
		case "storage":
			if val.Type() == cty.String {
				config.Storage = val.AsString()
			}
		case "key":
			if val.Type() == cty.String {
				config.Key = val.AsString()
			}
		case "timeout":
			if val.Type() == cty.String {
				config.Timeout = val.AsString()
			}
		case "wait":
			if val.Type() == cty.Bool {
				config.Wait = val.True()
			}
		case "retry":
			if val.Type() == cty.String {
				config.Retry = val.AsString()
			}
		}
	}

	return config, nil
}

func (p *Parser) parseSemaphoreBlock(block *hcl.Block) (*SemaphoreConfig, error) {
	config := &SemaphoreConfig{}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		switch name {
		case "storage":
			if val.Type() == cty.String {
				config.Storage = val.AsString()
			}
		case "key":
			if val.Type() == cty.String {
				config.Key = val.AsString()
			}
		case "max_permits":
			if val.Type() == cty.Number {
				n, _ := val.AsBigFloat().Int64()
				config.MaxPermits = int(n)
			}
		case "timeout":
			if val.Type() == cty.String {
				config.Timeout = val.AsString()
			}
		case "lease":
			if val.Type() == cty.String {
				config.Lease = val.AsString()
			}
		}
	}

	return config, nil
}

func (p *Parser) parseCoordinateBlock(block *hcl.Block) (*CoordinateConfig, error) {
	config := &CoordinateConfig{}

	content, diags := block.Body.Content(&hcl.BodySchema{
		Attributes: []hcl.AttributeSchema{
			{Name: "storage"},
			{Name: "timeout"},
			{Name: "on_timeout"},
			{Name: "max_retries"},
		},
		Blocks: []hcl.BlockHeaderSchema{
			{Type: "wait"},
			{Type: "signal"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("coordinate content error: %s", diags.Error())
	}

	for name, attr := range content.Attributes {
		val, _ := attr.Expr.Value(p.evalCtx)
		switch name {
		case "storage":
			if val.Type() == cty.String {
				config.Storage = val.AsString()
			}
		case "timeout":
			if val.Type() == cty.String {
				config.Timeout = val.AsString()
			}
		case "on_timeout":
			if val.Type() == cty.String {
				config.OnTimeout = val.AsString()
			}
		case "max_retries":
			if val.Type() == cty.Number {
				n, _ := val.AsBigFloat().Int64()
				config.MaxRetries = int(n)
			}
		}
	}

	for _, nested := range content.Blocks {
		attrs, _ := nested.Body.JustAttributes()
		switch nested.Type {
		case "wait":
			wait := &WaitConfig{}
			for name, attr := range attrs {
				val, _ := attr.Expr.Value(p.evalCtx)
				if val.Type() != cty.String {
					continue
				}
				switch name {
				case "when":
					wait.When = val.AsString()
				case "for":
					wait.For = val.AsString()
				}
			}
			config.Wait = wait

		case "signal":
			signal := &SignalConfig{}
			for name, attr := range attrs {
				val, _ := attr.Expr.Value(p.evalCtx)
				if val.Type() != cty.String {
					continue
				}
				switch name {
				case "when":
					signal.When = val.AsString()
				case "emit":
					signal.Emit = val.AsString()
				case "ttl":
					signal.TTL = val.AsString()
				}
			}
			config.Signal = signal
		}
	}

	return config, nil
}

func (p *Parser) parseRequireBlock(block *hcl.Block) (*RequireConfig, error) {
	config := &RequireConfig{
		Roles: make([]string, 0),
	}

	attrs, _ := block.Body.JustAttributes()

	if attr, ok := attrs["roles"]; ok {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type().IsTupleType() || val.Type().IsListType() {
			for it := val.ElementIterator(); it.Next(); {
				_, v := it.Element()
				if v.Type() == cty.String {
					config.Roles = append(config.Roles, v.AsString())
				}
			}
		}
	}

	return config, nil
}

func (p *Parser) parseErrorHandlingBlock(block *hcl.Block) (*ErrorHandlingConfig, error) {
	config := &ErrorHandlingConfig{}

	content, diags := block.Body.Content(&hcl.BodySchema{
		Blocks: []hcl.BlockHeaderSchema{
			{Type: "retry"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("error_handling content error: %s", diags.Error())
	}

	for _, nested := range content.Blocks {
		if nested.Type == "retry" {
			retry := &RetryConfig{}
			attrs, _ := nested.Body.JustAttributes()

			for name, attr := range attrs {
				val, _ := attr.Expr.Value(p.evalCtx)
				switch name {
				case "attempts":
					if val.Type() == cty.Number {
						n, _ := val.AsBigFloat().Int64()
						retry.Attempts = int(n)
					}
				case "delay":
					if val.Type() == cty.String {
						retry.Delay = val.AsString()
					}
				case "backoff":
					if val.Type() == cty.String {
						retry.Backoff = val.AsString()
					}
				}
			}

			config.Retry = retry
		}
	}

	return config, nil
}

func (p *Parser) parseTypeBlock(block *hcl.Block) (*TypeConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("type block requires a name label")
	}

	config := &TypeConfig{
		Name:       block.Labels[0],
		SourceFile: block.DefRange.Filename,
		Fields:     make(map[string]*FieldConfig),
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		field := &FieldConfig{
			Required: true,
		}

		// Try to get the type from the expression
		field.Type = exprToString(attr.Expr)

		config.Fields[name] = field
	}

	return config, nil
}

func (p *Parser) parseTransformBlock(block *hcl.Block) (*TransformConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("transform block requires a name label")
	}

	config := &TransformConfig{
		Name:       block.Labels[0],
		SourceFile: block.DefRange.Filename,
		Mappings:   make(map[string]string),
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		config.Mappings[name] = exprToString(attr.Expr)
	}

	return config, nil
}

func (p *Parser) parseValidatorBlock(block *hcl.Block) (*ValidatorConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("validator block requires a name label")
	}

	config := &ValidatorConfig{
		Name:       block.Labels[0],
		SourceFile: block.DefRange.Filename,
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "type":
			config.Type = val.AsString()
		case "pattern":
			config.Pattern = val.AsString()
		case "expr":
			config.Expr = val.AsString()
		case "module":
			config.Module = val.AsString()
		case "entrypoint":
			config.Entrypoint = val.AsString()
		case "message":
			config.Message = val.AsString()
		}
	}

	return config, nil
}

func (p *Parser) parseAspectBlock(block *hcl.Block) (*AspectConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("aspect block requires a name label")
	}

	config := &AspectConfig{
		Name:       block.Labels[0],
		SourceFile: block.DefRange.Filename,
		On:         make([]string, 0),
	}

	content, diags := block.Body.Content(&hcl.BodySchema{
		Attributes: []hcl.AttributeSchema{
			{Name: "on"},
			{Name: "when"},
			{Name: "if"},
			{Name: "priority"},
		},
		Blocks: []hcl.BlockHeaderSchema{
			{Type: "action"},
			{Type: "cache"},
			{Type: "invalidate"},
			{Type: "response"},
		},
	})
	if diags.HasErrors() {
		return nil, fmt.Errorf("aspect content error: %s", diags.Error())
	}

	for name, attr := range content.Attributes {
		val, _ := attr.Expr.Value(p.evalCtx)
		switch name {
		case "on":
			if val.Type().IsTupleType() || val.Type().IsListType() {
				for it := val.ElementIterator(); it.Next(); {
					_, v := it.Element()
					if v.Type() == cty.String {
						config.On = append(config.On, v.AsString())
					}
				}
			}
		case "when":
			if val.Type() == cty.String {
				config.When = val.AsString()
			}
		case "if":
			if val.Type() == cty.String {
				config.Condition = val.AsString()
			}
		case "priority":
			if val.Type() == cty.Number {
				n, _ := val.AsBigFloat().Int64()
				config.Priority = int(n)
			}
		}
	}

	for _, nested := range content.Blocks {
		switch nested.Type {
		case "action":
			action := &AspectActionConfig{
				Transform: make(map[string]string),
			}
			// Parse action with potential nested transform block
			actionContent, actionDiags := nested.Body.Content(&hcl.BodySchema{
				Attributes: []hcl.AttributeSchema{
					{Name: "connector"},
					{Name: "flow"},
					{Name: "operation"},
					{Name: "target"},
				},
				Blocks: []hcl.BlockHeaderSchema{
					{Type: "transform"},
				},
			})
			if actionDiags.HasErrors() {
				// Fallback: parse as flat attributes (old format)
				attrs, _ := nested.Body.JustAttributes()
				for name, attr := range attrs {
					val, _ := attr.Expr.Value(p.evalCtx)
					if val.Type() != cty.String {
						continue
					}
					switch name {
					case "connector":
						action.Connector = val.AsString()
					case "flow":
						action.Flow = val.AsString()
					case "operation":
						action.Operation = val.AsString()
					case "target":
						action.Target = val.AsString()
					default:
						action.Transform[name] = val.AsString()
					}
				}
			} else {
				for name, attr := range actionContent.Attributes {
					val, _ := attr.Expr.Value(p.evalCtx)
					if val.Type() != cty.String {
						continue
					}
					switch name {
					case "connector":
						action.Connector = val.AsString()
					case "flow":
						action.Flow = val.AsString()
					case "operation":
						action.Operation = val.AsString()
					case "target":
						action.Target = val.AsString()
					}
				}
				// Parse nested transform block
				for _, tBlock := range actionContent.Blocks {
					if tBlock.Type == "transform" {
						tAttrs, _ := tBlock.Body.JustAttributes()
						for tName, tAttr := range tAttrs {
							tVal, _ := tAttr.Expr.Value(p.evalCtx)
							if tVal.Type() == cty.String {
								action.Transform[tName] = tVal.AsString()
							}
						}
					}
				}
			}
			config.Action = action

		case "cache":
			cache, err := p.parseFlowCacheBlock(nested)
			if err != nil {
				return nil, err
			}
			config.Cache = cache

		case "invalidate":
			inv := &InvalidateConfig{
				Keys:     make([]string, 0),
				Patterns: make([]string, 0),
			}
			attrs, _ := nested.Body.JustAttributes()
			for name, attr := range attrs {
				val, _ := attr.Expr.Value(p.evalCtx)
				switch name {
				case "storage":
					if val.Type() == cty.String {
						inv.Storage = val.AsString()
					}
				case "keys":
					if val.Type().IsTupleType() || val.Type().IsListType() {
						for it := val.ElementIterator(); it.Next(); {
							_, v := it.Element()
							if v.Type() == cty.String {
								inv.Keys = append(inv.Keys, v.AsString())
							}
						}
					}
				case "patterns":
					if val.Type().IsTupleType() || val.Type().IsListType() {
						for it := val.ElementIterator(); it.Next(); {
							_, v := it.Element()
							if v.Type() == cty.String {
								inv.Patterns = append(inv.Patterns, v.AsString())
							}
						}
					}
				}
			}
			config.Invalidate = inv

		case "response":
			resp := &AspectResponseConfig{
				Headers: make(map[string]string),
				Fields:  make(map[string]string),
			}
			respContent, respDiags := nested.Body.Content(&hcl.BodySchema{
				Attributes: []hcl.AttributeSchema{
					{Name: "headers"},
				},
				Blocks: []hcl.BlockHeaderSchema{},
			})
			if respDiags.HasErrors() {
				// Fallback: treat all as fields
				attrs, _ := nested.Body.JustAttributes()
				for name, attr := range attrs {
					val, _ := attr.Expr.Value(p.evalCtx)
					if val.Type() == cty.String {
						resp.Fields[name] = val.AsString()
					}
				}
			} else {
				// Parse headers attribute (map)
				if headersAttr, ok := respContent.Attributes["headers"]; ok {
					hVal, _ := headersAttr.Expr.Value(p.evalCtx)
					if hVal.Type().IsObjectType() || hVal.Type().IsMapType() {
						for it := hVal.ElementIterator(); it.Next(); {
							k, v := it.Element()
							if v.Type() == cty.String {
								resp.Headers[k.AsString()] = v.AsString()
							}
						}
					}
				}
				// Remaining attributes are CEL field expressions
				// Re-parse with JustAttributes to get all
				allAttrs, _ := nested.Body.JustAttributes()
				for name, attr := range allAttrs {
					if name == "headers" {
						continue
					}
					val, _ := attr.Expr.Value(p.evalCtx)
					if val.Type() == cty.String {
						resp.Fields[name] = val.AsString()
					}
				}
			}
			config.Response = resp
		}
	}

	return config, nil
}

func (p *Parser) parseNamedCacheBlock(block *hcl.Block) (*NamedCacheConfig, error) {
	if len(block.Labels) < 1 {
		return nil, fmt.Errorf("cache block requires a name label")
	}

	config := &NamedCacheConfig{
		Name: block.Labels[0],
	}

	attrs, _ := block.Body.JustAttributes()

	for name, attr := range attrs {
		val, _ := attr.Expr.Value(p.evalCtx)
		if val.Type() != cty.String {
			continue
		}
		switch name {
		case "storage":
			config.Storage = val.AsString()
		case "key":
			config.Key = val.AsString()
		case "ttl":
			config.TTL = val.AsString()
		}
	}

	return config, nil
}

// Helper functions

func mergeConfig(dst, src *Configuration) {
	if src.Service != nil {
		dst.Service = src.Service
	}
	dst.Connectors = append(dst.Connectors, src.Connectors...)
	dst.Flows = append(dst.Flows, src.Flows...)
	dst.Types = append(dst.Types, src.Types...)
	dst.Transforms = append(dst.Transforms, src.Transforms...)
	dst.Validators = append(dst.Validators, src.Validators...)
	dst.Aspects = append(dst.Aspects, src.Aspects...)
	dst.NamedCaches = append(dst.NamedCaches, src.NamedCaches...)
}

// sourceCache stores parsed file/inline content for expression extraction.
var sourceCache = map[string][]byte{}

// extractExprSource extracts the source text of an HCL expression from cached sources.
func extractExprSource(expr hcl.Expression) string {
	rng := expr.Range()
	if src, ok := sourceCache[rng.Filename]; ok {
		extracted := rng.SliceBytes(src)
		return strings.TrimSpace(string(extracted))
	}
	// Try reading from file
	if rng.Filename != "" {
		content, err := os.ReadFile(rng.Filename)
		if err == nil {
			extracted := rng.SliceBytes(content)
			return strings.TrimSpace(string(extracted))
		}
	}
	return ""
}

func ctyToGo(val cty.Value) interface{} {
	if val.IsNull() {
		return nil
	}

	switch {
	case val.Type() == cty.String:
		return val.AsString()
	case val.Type() == cty.Number:
		f, _ := val.AsBigFloat().Float64()
		return f
	case val.Type() == cty.Bool:
		return val.True()
	case val.Type().IsTupleType() || val.Type().IsListType():
		result := make([]interface{}, 0)
		for it := val.ElementIterator(); it.Next(); {
			_, v := it.Element()
			result = append(result, ctyToGo(v))
		}
		return result
	case val.Type().IsMapType() || val.Type().IsObjectType():
		result := make(map[string]interface{})
		for it := val.ElementIterator(); it.Next(); {
			k, v := it.Element()
			result[k.AsString()] = ctyToGo(v)
		}
		return result
	default:
		return val.GoString()
	}
}

func exprToString(expr hcl.Expression) string {
	// Get the source range and try to extract the text
	rng := expr.Range()
	if rng.Filename != "" {
		// Try to read the file and extract the expression
		content, err := os.ReadFile(rng.Filename)
		if err == nil {
			lines := strings.Split(string(content), "\n")
			if rng.Start.Line > 0 && rng.Start.Line <= len(lines) {
				line := lines[rng.Start.Line-1]
				if rng.Start.Column > 0 && rng.End.Column <= len(line)+1 {
					return strings.TrimSpace(line[rng.Start.Column-1 : rng.End.Column-1])
				}
			}
		}
	}

	// Fallback: try to evaluate and return as string
	val, diags := expr.Value(nil)
	if !diags.HasErrors() && val.Type() == cty.String {
		return val.AsString()
	}

	return ""
}
