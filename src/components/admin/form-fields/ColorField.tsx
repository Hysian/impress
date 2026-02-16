interface ColorFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
}

export default function ColorField({
  value,
  onChange,
  label,
  required,
  disabled,
}: ColorFieldProps) {
  const current = value || "#000000";

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-10 h-10 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed p-0"
        />
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
