package audit

import (
	"context"
	"encoding/json"
	"time"

	"blotting-consultancy/internal/model"
	"blotting-consultancy/internal/repository"
)

// DbWriter persists audit events to the database
type DbWriter struct {
	repo repository.AuditEventRepository
}

// NewDbWriter creates a new database-backed audit writer
func NewDbWriter(repo repository.AuditEventRepository) *DbWriter {
	return &DbWriter{repo: repo}
}

// Log persists a structured audit event to the database
func (w *DbWriter) Log(event Event) {
	detailsJSON := ""
	if event.Details != nil {
		if b, err := json.Marshal(event.Details); err == nil {
			detailsJSON = string(b)
		}
	}

	ae := &model.AuditEvent{
		Action:   event.Action,
		Actor:    event.Actor,
		Resource: event.Resource,
		Result:   event.Result,
		Details:  detailsJSON,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Best-effort: if DB write fails, the event is lost (caller should also use Logger for file-based backup)
	_ = w.repo.Create(ctx, ae)
}

// LogPublishSuccess records a successful publish operation
func (w *DbWriter) LogPublishSuccess(pageKey string, publishedVersion int, actor string, draftVersion int) {
	w.Log(Event{
		Action:   "content.publish",
		Actor:    actor,
		Resource: pageKey,
		Result:   "success",
		Details: map[string]interface{}{
			"published_version": publishedVersion,
			"draft_version":     draftVersion,
		},
	})
}

// LogPublishFailure records a failed publish operation
func (w *DbWriter) LogPublishFailure(pageKey string, actor string, reason string, details map[string]interface{}) {
	if details == nil {
		details = make(map[string]interface{})
	}
	details["reason"] = reason
	w.Log(Event{
		Action:   "content.publish",
		Actor:    actor,
		Resource: pageKey,
		Result:   "failure",
		Details:  details,
	})
}

// LogRollbackSuccess records a successful rollback operation
func (w *DbWriter) LogRollbackSuccess(pageKey string, publishedVersion int, sourceVersion int, actor string) {
	w.Log(Event{
		Action:   "content.rollback",
		Actor:    actor,
		Resource: pageKey,
		Result:   "success",
		Details: map[string]interface{}{
			"published_version": publishedVersion,
			"source_version":    sourceVersion,
		},
	})
}

// LogRollbackFailure records a failed rollback operation
func (w *DbWriter) LogRollbackFailure(pageKey string, actor string, sourceVersion int, reason string) {
	w.Log(Event{
		Action:   "content.rollback",
		Actor:    actor,
		Resource: pageKey,
		Result:   "failure",
		Details: map[string]interface{}{
			"source_version": sourceVersion,
			"reason":         reason,
		},
	})
}

// LogValidation records a validation operation
func (w *DbWriter) LogValidation(pageKey string, actor string, valid bool, errorCount int, translationIssueCount int) {
	result := "success"
	if !valid {
		result = "failure"
	}
	w.Log(Event{
		Action:   "content.validate",
		Actor:    actor,
		Resource: pageKey,
		Result:   result,
		Details: map[string]interface{}{
			"valid":                   valid,
			"error_count":             errorCount,
			"translation_issue_count": translationIssueCount,
		},
	})
}
