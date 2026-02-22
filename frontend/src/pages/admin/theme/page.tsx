import { useState, useEffect } from "react";
import { getThemeSettings, updateThemeSettings } from "@/api/theme";
import { defaultTokens, type ThemeTokens } from "@/theme";
import { listThemes } from "@/theme/packages";

interface ColorField {
  key: keyof ThemeTokens["colors"];
  label: string;
}

const colorFields: ColorField[] = [
  { key: "primary", label: "主色 (Primary)" },
  { key: "primaryDark", label: "主色深 (Primary Dark)" },
  { key: "accent", label: "强调色 (Accent)" },
  { key: "accentHover", label: "强调色悬停 (Accent Hover)" },
  { key: "surface", label: "背景色 (Surface)" },
  { key: "surfaceAlt", label: "交替背景 (Surface Alt)" },
  { key: "onPrimary", label: "主色上文字 (On Primary)" },
  { key: "onSurface", label: "背景上文字 (On Surface)" },
  { key: "onSurfaceMuted", label: "次要文字 (On Surface Muted)" },
  { key: "border", label: "边框色 (Border)" },
];

export default function AdminThemePage() {
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getThemeSettings()
      .then((data) => {
        if (data.theme) setTokens(data.theme);
      })
      .catch(() => {
        // use defaults
      })
      .finally(() => setLoading(false));
  }, []);

  const handleColorChange = (key: keyof ThemeTokens["colors"], value: string) => {
    setTokens((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const handleFontChange = (key: keyof ThemeTokens["fonts"], value: string) => {
    setTokens((prev) => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value },
    }));
  };

  const handleLayoutChange = (key: keyof ThemeTokens["layout"], value: string) => {
    setTokens((prev) => ({
      ...prev,
      layout: { ...prev.layout, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateThemeSettings(tokens);
      setMessage("保存成功，刷新页面后生效");
    } catch {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTokens(defaultTokens);
  };

  const themes = listThemes();

  const isActiveTheme = (themePrimary: string) => {
    return tokens.colors.primary.toLowerCase() === themePrimary.toLowerCase();
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">主题设置</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            重置为默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.includes("成功")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Theme Gallery */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">主题画廊</h3>
        <p className="text-sm text-gray-500 mb-4">选择一个预设主题快速应用，点击后仍需点击「保存设置」生效</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const active = isActiveTheme(theme.tokens.colors.primary);
            return (
              <div
                key={theme.id}
                className={`rounded-lg border-2 overflow-hidden transition-all ${
                  active
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-[60px] w-full relative"
                  style={{ background: theme.preview }}
                >
                  {active && (
                    <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded">
                      当前主题
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900">{theme.name}</h4>
                    <span className="text-xs text-gray-400">v{theme.version}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{theme.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{theme.author}</span>
                    <button
                      onClick={() => setTokens(theme.tokens)}
                      disabled={active}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        active
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {active ? "已应用" : "应用主题"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section Divider */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">自定义设置</h3>
        <p className="text-sm text-gray-500">在主题基础上进一步调整</p>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">颜色</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colorFields.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={tokens.colors[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">{label}</div>
                <input
                  type="text"
                  value={tokens.colors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-full text-xs font-mono text-gray-500 border border-gray-200 rounded px-2 py-1 mt-1"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">字体</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              正文字体 (Sans)
            </label>
            <input
              type="text"
              value={tokens.fonts.sans}
              onChange={(e) => handleFontChange("sans", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题字体 (Heading)
            </label>
            <input
              type="text"
              value={tokens.fonts.heading}
              onChange={(e) => handleFontChange("heading", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">布局</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大宽度
            </label>
            <input
              type="text"
              value={tokens.layout.maxWidth}
              onChange={(e) => handleLayoutChange("maxWidth", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              圆角
            </label>
            <input
              type="text"
              value={tokens.layout.borderRadius}
              onChange={(e) =>
                handleLayoutChange("borderRadius", e.target.value)
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">预览</h3>
        <div className="flex gap-4 flex-wrap">
          <div
            className="w-24 h-24 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: tokens.colors.primary }}
          >
            Primary
          </div>
          <div
            className="w-24 h-24 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: tokens.colors.accent }}
          >
            Accent
          </div>
          <div
            className="w-24 h-24 rounded-lg border flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: tokens.colors.surface,
              color: tokens.colors.onSurface,
              borderColor: tokens.colors.border,
            }}
          >
            Surface
          </div>
          <div
            className="w-24 h-24 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: tokens.colors.surfaceAlt,
              color: tokens.colors.onSurfaceMuted,
            }}
          >
            Surface Alt
          </div>
        </div>
      </div>
    </div>
  );
}
