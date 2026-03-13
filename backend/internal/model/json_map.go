package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// JSONMap is a map[string]interface{} that implements sql.Scanner and driver.Valuer for JSON columns.
type JSONMap map[string]interface{}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("JSONMap.Scan: unsupported type %T", value)
	}
	result := make(JSONMap)
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}
	*j = result
	return nil
}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

// NullableJSONMap is like JSONMap but serializes Go nil as SQL NULL (not "{}").
// Use this for columns where NULL has semantic meaning (e.g., published_config).
type NullableJSONMap map[string]interface{}

func (j *NullableJSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("NullableJSONMap.Scan: unsupported type %T", value)
	}
	result := make(NullableJSONMap)
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}
	*j = result
	return nil
}

func (j NullableJSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil // SQL NULL
	}
	return json.Marshal(j)
}
