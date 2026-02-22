import { useState } from "react";
import type { FieldDescriptor } from "@/types/schema";
import FieldRenderer from "./FieldRenderer";

interface ObjectFieldProps {
  value: Record<string, unknown> | undefined;
  onChange: (value: Record<string, unknown>) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
  fields: Record<string, FieldDescriptor>;
  onPickImage?: (onSelect: (url: string) => void) => void;
}

export default function ObjectField({
  value,
  onChange,
  label,
  required,
  disabled,
  path,
  fields,
  onPickImage,
}: ObjectFieldProps) {
  const [collapsed, setCollapsed] = useState(false);
  const current = value || {};

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <span className="text-gray-400 text-xs">{collapsed ? "展开 ▼" : "收起 ▲"}</span>
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {Object.entries(fields).map(([key, descriptor]) => (
            <FieldRenderer
              key={key}
              descriptor={descriptor}
              value={current[key]}
              onChange={(v) => {
                onChange({ ...current, [key]: v });
              }}
              path={`${path}.${key}`}
              disabled={disabled || descriptor.editable === false}
              onPickImage={onPickImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
