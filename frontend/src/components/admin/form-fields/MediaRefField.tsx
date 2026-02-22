import { useState } from "react";
import LocalizedTextField from "./LocalizedTextField";

interface MediaRefValue {
  url: string;
  alt: { zh: string; en: string };
}

interface MediaRefFieldProps {
  value: MediaRefValue | undefined;
  onChange: (value: MediaRefValue) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
  onPickImage?: (onSelect: (url: string) => void) => void;
}

export default function MediaRefField({
  value,
  onChange,
  label,
  required,
  disabled,
  path,
  onPickImage,
}: MediaRefFieldProps) {
  const current = value || { url: "", alt: { zh: "", en: "" } };
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* URL input + preview */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={current.url}
          onChange={(e) => onChange({ ...current, url: e.target.value })}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="图片 URL..."
        />
        {onPickImage && (
          <button
            type="button"
            onClick={() => onPickImage?.((url) => onChange({ ...current, url }))}
            disabled={disabled}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            选择图片
          </button>
        )}
        {current.url && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 whitespace-nowrap"
          >
            {showPreview ? "隐藏" : "预览"}
          </button>
        )}
      </div>

      {/* Image preview */}
      {showPreview && current.url && (
        <div className="mt-2">
          <img
            src={current.url}
            alt={current.alt?.zh || ""}
            className="max-h-32 rounded border border-gray-200 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Alt text */}
      <LocalizedTextField
        value={current.alt}
        onChange={(alt) => onChange({ ...current, alt })}
        label="替代文本 (alt)"
        disabled={disabled}
        path={`${path}.alt`}
      />
    </div>
  );
}
