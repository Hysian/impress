interface StringFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
}

export default function StringField({
  value,
  onChange,
  label,
  required,
  disabled,
}: StringFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder="请输入..."
      />
    </div>
  );
}
