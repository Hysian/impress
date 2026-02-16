interface EnumFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
  options: { label: string; value: string }[];
}

export default function EnumField({
  value,
  onChange,
  label,
  required,
  disabled,
  options,
}: EnumFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">请选择...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
