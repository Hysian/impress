import type { FieldDescriptor } from "@/types/schema";
import FieldRenderer from "./FieldRenderer";

interface ArrayFieldProps {
  value: unknown[] | undefined;
  onChange: (value: unknown[]) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
  itemFields: FieldDescriptor[];
  minItems?: number;
  onPickImage?: (onSelect: (url: string) => void) => void;
}

/**
 * Returns a default value for an array item based on itemFields.
 * - Single field: return a default for that type
 * - Multiple fields: return an object with keys field_0, field_1, ...
 *   (but for the actual data model, we use the field labels as keys won't work;
 *    instead, we rely on the parent schema's key names from ObjectField/editor)
 *
 * For simplicity, when itemFields has a single field, we produce a bare value.
 * When multiple, we produce an object whose keys match the parent schema structure.
 */
function getDefaultItem(itemFields: FieldDescriptor[]): unknown {
  if (itemFields.length === 1) {
    return getDefaultForType(itemFields[0]);
  }
  // Multiple fields → object with indexed keys matching the parent object structure
  // The parent schema defines the keys; here we just create an empty object
  // that will be populated by the user
  const obj: Record<string, unknown> = {};
  itemFields.forEach((field, idx) => {
    const key = `field_${idx}`;
    obj[key] = getDefaultForType(field);
  });
  return obj;
}

function getDefaultForType(field: FieldDescriptor): unknown {
  switch (field.type) {
    case "localizedText":
    case "localizedRichText":
      return { zh: "", en: "" };
    case "mediaRef":
      return { url: "", alt: { zh: "", en: "" } };
    case "cta":
      return { label: { zh: "", en: "" }, href: "", target: "_self" };
    case "string":
    case "enum":
    case "color":
      return "";
    case "array":
      return [];
    case "object": {
      const obj: Record<string, unknown> = {};
      Object.entries(field.fields).forEach(([k, f]) => {
        obj[k] = getDefaultForType(f);
      });
      return obj;
    }
    default:
      return "";
  }
}

export default function ArrayField({
  value,
  onChange,
  label,
  required,
  disabled,
  path,
  itemFields,
  minItems,
  onPickImage,
}: ArrayFieldProps) {
  const items = value || [];

  const addItem = () => {
    const newItem = getDefaultItem(itemFields);
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (minItems !== undefined && items.length <= minItems) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange(newItems);
  };

  const updateItem = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  /**
   * Render a single array item. If there's only one itemField, render it directly.
   * If multiple, render them as fields of an object.
   */
  const renderItem = (item: unknown, index: number) => {
    if (itemFields.length === 1) {
      const field = itemFields[0];
      return (
        <FieldRenderer
          descriptor={field}
          value={item}
          onChange={(v) => updateItem(index, v)}
          path={`${path}[${index}]`}
          disabled={disabled}
          onPickImage={onPickImage}
        />
      );
    }

    // Multiple fields: item should be an object
    const itemObj = (item || {}) as Record<string, unknown>;
    return (
      <div className="space-y-3">
        {itemFields.map((field, fieldIdx) => {
          const fieldKey = `field_${fieldIdx}`;
          return (
            <FieldRenderer
              key={fieldKey}
              descriptor={field}
              value={itemObj[fieldKey]}
              onChange={(v) => {
                updateItem(index, { ...itemObj, [fieldKey]: v });
              }}
              path={`${path}[${index}].${fieldKey}`}
              disabled={disabled}
              onPickImage={onPickImage}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-2 text-xs text-gray-500">({items.length} 项)</span>
        </label>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          + 添加
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic">暂无数据，点击"添加"新增</p>
      )}

      {items.map((item, index) => (
        <div key={index} className="relative p-4 border border-gray-200 rounded-lg bg-white">
          {/* Item header with controls */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, "up")}
                disabled={disabled || index === 0}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                title="上移"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, "down")}
                disabled={disabled || index === items.length - 1}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                title="下移"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled || (minItems !== undefined && items.length <= minItems)}
                className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-30"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>

          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
