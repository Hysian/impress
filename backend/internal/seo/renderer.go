package seo

import (
	"bytes"
	"fmt"
	"html/template"
	"os"
)

// Renderer renders index.html with dynamic meta tags.
type Renderer struct {
	tmpl *template.Template
}

// NewRenderer creates a renderer from an index.html file path.
func NewRenderer(filePath string) (*Renderer, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read template: %w", err)
	}
	return NewRendererFromString(string(content))
}

// NewRendererFromString creates a renderer from a template string.
func NewRendererFromString(tmplStr string) (*Renderer, error) {
	t, err := template.New("index").Parse(tmplStr)
	if err != nil {
		return nil, fmt.Errorf("parse template: %w", err)
	}
	return &Renderer{tmpl: t}, nil
}

// Render executes the template with the given PageMeta.
func (r *Renderer) Render(meta PageMeta) (string, error) {
	var buf bytes.Buffer
	if err := r.tmpl.Execute(&buf, meta); err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}
	return buf.String(), nil
}
