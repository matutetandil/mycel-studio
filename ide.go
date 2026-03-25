package main

import (
	"encoding/json"
	"os"
	"regexp"
	"strings"

	"github.com/matutetandil/mycel/pkg/connectors"
	"github.com/matutetandil/mycel/pkg/ide"
)

// IDEInit creates an IDE engine for the given project directory.
// Uses full connector registry for type-aware completions and diagnostics.
func (a *App) IDEInit(projectPath string) string {
	reg := connectors.FullRegistry()
	a.ideEngine = ide.NewEngine(projectPath, ide.WithRegistry(reg))
	diags := a.ideEngine.FullReindex()
	return toJSON(diags)
}

// IDEUpdateFile re-parses a single file with the given buffer content.
func (a *App) IDEUpdateFile(path string, content string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	diags := a.ideEngine.UpdateFile(path, []byte(content))
	return toJSON(diags)
}

// IDERemoveFile removes a file from the index.
func (a *App) IDERemoveFile(path string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	diags := a.ideEngine.RemoveFile(path)
	return toJSON(diags)
}

// IDEComplete returns completions at the given position.
func (a *App) IDEComplete(path string, line, col int) string {
	if a.ideEngine == nil {
		return "[]"
	}
	items := a.ideEngine.Complete(path, line, col)
	return toJSON(items)
}

// IDEHover returns hover documentation at the given position.
func (a *App) IDEHover(path string, line, col int) string {
	if a.ideEngine == nil {
		return "null"
	}
	result := a.ideEngine.Hover(path, line, col)
	if result == nil {
		return "null"
	}
	return toJSON(result)
}

// IDEDefinition returns go-to-definition location.
func (a *App) IDEDefinition(path string, line, col int) string {
	if a.ideEngine == nil {
		return "null"
	}
	loc := a.ideEngine.Definition(path, line, col)
	if loc == nil {
		return "null"
	}
	return toJSON(loc)
}

// IDEDiagnose returns diagnostics for a single file.
func (a *App) IDEDiagnose(path string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	diags := a.ideEngine.Diagnose(path)
	return toJSON(diags)
}

// IDEDiagnoseAll returns diagnostics for all project files.
func (a *App) IDEDiagnoseAll() string {
	if a.ideEngine == nil {
		return "[]"
	}
	diags := a.ideEngine.DiagnoseAll()
	return toJSON(diags)
}

// IDERename returns all edits needed to rename an entity.
func (a *App) IDERename(path string, line, col int, newName string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	edits := a.ideEngine.Rename(path, line, col, newName)
	return toJSON(edits)
}

// IDECodeActions returns available quick fixes at the given position.
func (a *App) IDECodeActions(path string, line, col int) string {
	if a.ideEngine == nil {
		return "[]"
	}
	actions := a.ideEngine.CodeActions(path, line, col)
	return toJSON(actions)
}

// IDESymbols returns all workspace symbols.
func (a *App) IDESymbols() string {
	if a.ideEngine == nil {
		return "[]"
	}
	symbols := a.ideEngine.Symbols()
	return toJSON(symbols)
}

// IDESymbolsForFile returns symbols for a specific file.
func (a *App) IDESymbolsForFile(path string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	symbols := a.ideEngine.SymbolsForFile(path)
	return toJSON(symbols)
}

// IDETransformRules returns ordered transform rules for breakpoint placement.
func (a *App) IDETransformRules(flowName string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	rules := a.ideEngine.TransformRules(flowName)
	return toJSON(rules)
}

// IDEFlowStages returns pipeline stages present in a flow.
func (a *App) IDEFlowStages(flowName string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	stages := a.ideEngine.FlowStages(flowName)
	return toJSON(stages)
}

// IDEAllBreakpoints returns all valid breakpoint locations grouped by file.
func (a *App) IDEAllBreakpoints() string {
	if a.ideEngine == nil {
		return "{}"
	}
	bps := a.ideEngine.AllBreakpoints()
	return toJSON(bps)
}

// IDEFlowBreakpoints returns valid breakpoint locations for a specific flow.
func (a *App) IDEFlowBreakpoints(flowName string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	bps := a.ideEngine.FlowBreakpoints(flowName)
	return toJSON(bps)
}

// IDERemoveBlock returns a TextEdit that removes a named block from a file.
// Used when deleting a component that shares a file with other blocks.
func (a *App) IDERemoveBlock(path, blockType, name string) string {
	if a.ideEngine == nil {
		return "null"
	}
	edit := a.ideEngine.RemoveBlock(path, blockType, name)
	if edit == nil {
		return "null"
	}
	return toJSON(edit)
}

// IDEHints returns all organization hints for the project.
func (a *App) IDEHints() string {
	if a.ideEngine == nil {
		return "[]"
	}
	hints := a.ideEngine.Hints()
	return toJSON(hints)
}

// IDEHintsForFile returns organization hints for a specific file.
func (a *App) IDEHintsForFile(path string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	hints := a.ideEngine.HintsForFile(path)
	return toJSON(hints)
}

// IDERenameFile updates the index when a file is renamed/moved.
func (a *App) IDERenameFile(oldPath, newPath string) string {
	if a.ideEngine == nil {
		return "[]"
	}
	diags := a.ideEngine.RenameFile(oldPath, newPath)
	return toJSON(diags)
}

// IDEExtractTransform extracts an inline transform from a flow into a named reusable transform.
func (a *App) IDEExtractTransform(flowName, transformName string) string {
	if a.ideEngine == nil {
		return "null"
	}
	result := a.ideEngine.ExtractTransform(flowName, transformName)
	if result == nil {
		return "null"
	}
	return toJSON(result)
}

// IDEGetIndex returns the full project index.
func (a *App) IDEGetIndex() string {
	if a.ideEngine == nil {
		return "{}"
	}
	index := a.ideEngine.GetIndex()
	return toJSON(index)
}

// IDEParseProject returns the project structure (connectors, flows, types, etc.)
// in the format expected by parseProjectToCanvas on the frontend.
// This replaces the old ParseHCL binding.
func (a *App) IDEParseProject(projectPath string) string {
	// Initialize or reuse engine
	if a.ideEngine == nil {
		reg := connectors.FullRegistry()
		a.ideEngine = ide.NewEngine(projectPath, ide.WithRegistry(reg))
		a.ideEngine.FullReindex()
	}

	index := a.ideEngine.GetIndex()
	result := map[string]any{
		"success": true,
		"project": buildProjectFromIndex(index, projectPath),
	}
	return toJSON(result)
}

func buildProjectFromIndex(index *ide.ProjectIndex, projectPath string) map[string]any {
	project := map[string]any{}
	prefix := projectPath + "/"

	// Convert absolute file path to relative
	relFile := func(absPath string) string {
		if strings.HasPrefix(absPath, prefix) {
			return absPath[len(prefix):]
		}
		return absPath
	}

	// Connectors
	connectors := []map[string]any{}
	for _, entity := range index.Connectors {
		conn := map[string]any{
			"name":       entity.Name,
			"type":       entity.ConnType,
			"sourceFile": relFile(entity.File),
		}
		if entity.Driver != "" {
			conn["driver"] = entity.Driver
		}
		// Extract properties from the block tree
		block := findBlock(index, entity.File, "connector", entity.Name)
		if block != nil {
			props := map[string]any{}
			for _, attr := range block.Attrs {
				if attr.Name != "type" && attr.Name != "driver" {
					props[attr.Name] = attr.ValueRaw
				}
			}
			if len(props) > 0 {
				conn["properties"] = props
			}
		}
		connectors = append(connectors, conn)
	}
	project["connectors"] = connectors

	// Flows
	flows := []map[string]any{}
	for _, entity := range index.Flows {
		flow := map[string]any{
			"name":       entity.Name,
			"sourceFile": relFile(entity.File),
		}
		block := findBlock(index, entity.File, "flow", entity.Name)
		if block != nil {
			// Extract flow children
			for _, child := range block.Children {
				switch child.Type {
				case "from":
					from := map[string]any{}
					for _, a := range child.Attrs {
						from[a.Name] = a.ValueRaw
					}
					flow["from"] = from
				case "to":
					to := map[string]any{}
					for _, a := range child.Attrs {
						to[a.Name] = a.ValueRaw
					}
					flow["to"] = to
				case "transform":
					mappings := map[string]string{}
					for _, a := range child.Attrs {
						mappings[a.Name] = a.ValueRaw
					}
					flow["transform"] = map[string]any{"mappings": mappings}
				case "validate":
					validate := map[string]any{}
					for _, a := range child.Attrs {
						validate[a.Name] = a.ValueRaw
					}
					flow["validate"] = validate
				}
			}
			// When attribute (cron)
			if when := block.GetAttr("when"); when != "" {
				flow["when"] = when
			}
		}
		flows = append(flows, flow)
	}
	project["flows"] = flows

	// Types
	types := []map[string]any{}
	for _, entity := range index.Types {
		typ := map[string]any{
			"name":       entity.Name,
			"sourceFile": relFile(entity.File),
		}
		block := findBlock(index, entity.File, "type", entity.Name)
		if block != nil {
			fields := map[string]map[string]any{}
			for _, child := range block.Children {
				field := map[string]any{"type": child.Type}
				for _, a := range child.Attrs {
					field[a.Name] = a.ValueRaw
				}
				if child.Name != "" {
					fields[child.Name] = field
				}
			}
			typ["fields"] = fields
		}
		types = append(types, typ)
	}
	project["types"] = types

	// Transforms
	transforms := []map[string]any{}
	for _, entity := range index.Transforms {
		tr := map[string]any{
			"name":       entity.Name,
			"sourceFile": relFile(entity.File),
		}
		block := findBlock(index, entity.File, "transform", entity.Name)
		if block != nil {
			mappings := map[string]string{}
			for _, a := range block.Attrs {
				mappings[a.Name] = a.ValueRaw
			}
			tr["mappings"] = mappings
		}
		transforms = append(transforms, tr)
	}
	project["transforms"] = transforms

	// Validators
	validators := []map[string]any{}
	for _, entity := range index.Validators {
		val := map[string]any{
			"name":       entity.Name,
			"sourceFile": relFile(entity.File),
		}
		block := findBlock(index, entity.File, "validator", entity.Name)
		if block != nil {
			for _, a := range block.Attrs {
				val[a.Name] = a.ValueRaw
			}
		}
		validators = append(validators, val)
	}
	project["validators"] = validators

	// Aspects
	aspects := []map[string]any{}
	for _, entity := range index.Aspects {
		asp := map[string]any{
			"name":       entity.Name,
			"sourceFile": relFile(entity.File),
		}
		block := findBlock(index, entity.File, "aspect", entity.Name)
		if block != nil {
			for _, a := range block.Attrs {
				if a.Name == "on" {
					// "on" is a list of strings — ValueRaw doesn't handle lists,
					// so extract from source file
					asp["on"] = extractListFromFile(entity.File, a.Name, block)
				} else {
					asp[a.Name] = a.ValueRaw
				}
			}
			for _, child := range block.Children {
				if child.Type == "action" {
					action := map[string]any{}
					for _, a := range child.Attrs {
						action[a.Name] = a.ValueRaw
					}
					for _, grandchild := range child.Children {
						if grandchild.Type == "transform" {
							transform := map[string]string{}
							for _, a := range grandchild.Attrs {
								transform[a.Name] = a.ValueRaw
							}
							action["transform"] = transform
						}
					}
					asp["action"] = action
				}
			}
		}
		aspects = append(aspects, asp)
	}
	project["aspects"] = aspects

	// Service config
	for _, fi := range index.Files {
		for _, block := range fi.Blocks {
			if block.Type == "service" {
				service := map[string]any{}
				for _, a := range block.Attrs {
					service[a.Name] = a.ValueRaw
				}
				project["service"] = service
				break
			}
		}
	}

	return project
}

// extractListFromFile reads a list attribute value from the HCL source file.
// HCL lists like `on = ["a", "b"]` are not extracted by ValueRaw (which returns "").
// This reads the source and parses the list with regex.
func extractListFromFile(file, attrName string, block *ide.Block) []string {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	content := string(data)

	// Find the attribute line within the block's range
	lines := strings.Split(content, "\n")
	startLine := block.Range.Start.Line - 1 // 0-based
	endLine := block.Range.End.Line
	if endLine > len(lines) {
		endLine = len(lines)
	}

	re := regexp.MustCompile(attrName + `\s*=\s*\[([^\]]*)\]`)
	for i := startLine; i < endLine; i++ {
		match := re.FindStringSubmatch(lines[i])
		if match != nil {
			// Parse individual quoted strings from the list
			strRe := regexp.MustCompile(`"([^"]*)"`)
			matches := strRe.FindAllStringSubmatch(match[1], -1)
			result := make([]string, 0, len(matches))
			for _, m := range matches {
				result = append(result, m[1])
			}
			return result
		}
	}
	return nil
}

func findBlock(index *ide.ProjectIndex, file, blockType, name string) *ide.Block {
	fi, ok := index.Files[file]
	if !ok {
		return nil
	}
	for _, b := range fi.Blocks {
		if b.Type == blockType && b.Name == name {
			return b
		}
	}
	return nil
}

func toJSON(v any) string {
	out, err := json.Marshal(v)
	if err != nil {
		return "null"
	}
	return string(out)
}
