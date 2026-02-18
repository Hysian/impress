import LocalizedTextField from "./LocalizedTextField";

interface CtaValue {
  label: { zh: string; en: string };
  href: string;
  target?: string;
}

interface CtaFieldProps {
  value: CtaValue | undefined;
  onChange: (value: CtaValue) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  path: string;
}

export default function CtaField({
  value,
  onChange,
  label,
  required,
  disabled,
  path,
}: CtaFieldProps) {
  const current = value || { label: { zh: "", en: "" }, href: "", target: "_self" };

  return (
    <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <LocalizedTextField
        value={current.label}
        onChange={(l) => onChange({ ...current, label: l })}
        label="按钮文字"
        required={required}
        disabled={disabled}
        path={`${path}.label`}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-gray-500 mb-1 block">链接地址</span>
          <input
            type="text"
            value={current.href}
            onChange={(e) => onChange({ ...current, href: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="/page 或 https://..."
          />
        </div>
        <div>
          <span className="text-xs text-gray-500 mb-1 block">打开方式</span>
          <select
            value={current.target || "_self"}
            onChange={(e) => onChange({ ...current, target: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="_self">当前窗口</option>
            <option value="_blank">新窗口</option>
          </select>
        </div>
      </div>
    </div>
  );
}
