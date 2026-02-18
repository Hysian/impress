interface LocalizedTextFieldProps {
  value: { zh: string; en: string } | undefined;
  onChange: (value: { zh: string; en: string }) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
}

export default function LocalizedTextField({
  value,
  onChange,
  label,
  required,
  disabled,
}: LocalizedTextFieldProps) {
  const current = value || { zh: "", en: "" };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-gray-500 mb-1 block">中文</span>
          <input
            type="text"
            value={current.zh}
            onChange={(e) => onChange({ ...current, zh: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="请输入中文..."
          />
        </div>
        <div>
          <span className="text-xs text-gray-500 mb-1 block">English</span>
          <input
            type="text"
            value={current.en}
            onChange={(e) => onChange({ ...current, en: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter English..."
          />
        </div>
      </div>
    </div>
  );
}
