import { useState, useEffect } from "react";
import { getThemeSettings, updateThemeSettings } from "@/api/theme";
import { defaultTokens, type ThemeTokens } from "@/theme";
import { useThemeManager } from "@/plugins/hooks";
import {
  listInstalledThemes,
  activateTheme,
  uninstallTheme,
  installTheme,
  type InstalledThemeDTO,
} from "@/api/installedThemes";
import { themeManager } from "@/plugins/ThemeManager";

type TabId = "gallery" | "customize" | "install";

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
  const [activeTab, setActiveTab] = useState<TabId>("gallery");
  const { activeTheme } = useThemeManager();

  // --- Gallery tab state ---
  const [installedThemes, setInstalledThemes] = useState<InstalledThemeDTO[]>([]);
  const [gallerLoading, setGalleryLoading] = useState(true);
  const [galleryMsg, setGalleryMsg] = useState("");

  // --- Customize tab state ---
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [customizeLoading, setCustomizeLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customizeMsg, setCustomizeMsg] = useState("");

  // --- Install tab state ---
  const [installUrl, setInstallUrl] = useState("");
  const [installLoading, setInstallLoading] = useState(false);
  const [installPreview, setInstallPreview] = useState<{ name: string; nameZh: string; description: string; author: string; version: string; themeId: string } | null>(null);
  const [installMsg, setInstallMsg] = useState("");

  // Fetch installed themes
  useEffect(() => {
    fetchInstalledThemes();
  }, []);

  // Fetch current tokens
  useEffect(() => {
    getThemeSettings()
      .then((data) => {
        if (data.theme) setTokens(data.theme);
      })
      .catch(() => {})
      .finally(() => setCustomizeLoading(false));
  }, []);

  async function fetchInstalledThemes() {
    setGalleryLoading(true);
    try {
      const themes = await listInstalledThemes();
      setInstalledThemes(themes);
    } catch {
      setGalleryMsg("加载主题列表失败");
    } finally {
      setGalleryLoading(false);
    }
  }

  async function handleActivate(theme: InstalledThemeDTO) {
    setGalleryMsg("");
    try {
      await activateTheme(theme.id);
      setGalleryMsg(`已激活主题「${theme.nameZh || theme.name}」，刷新页面后生效`);
      fetchInstalledThemes();
    } catch {
      setGalleryMsg("激活失败");
    }
  }

  async function handleUninstall(theme: InstalledThemeDTO) {
    if (!confirm(`确定卸载主题「${theme.nameZh || theme.name}」？`)) return;
    setGalleryMsg("");
    try {
      await uninstallTheme(theme.id);
      setGalleryMsg("主题已卸载");
      fetchInstalledThemes();
    } catch (e: any) {
      setGalleryMsg(e.response?.data?.error || "卸载失败");
    }
  }

  // --- Customize handlers ---
  const tokenPresets = activeTheme?.tokenPresets ?? [];

  const handleColorChange = (key: keyof ThemeTokens["colors"], value: string) => {
    setTokens((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };
  const handleFontChange = (key: keyof ThemeTokens["fonts"], value: string) => {
    setTokens((prev) => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));
  };
  const handleLayoutChange = (key: keyof ThemeTokens["layout"], value: string) => {
    setTokens((prev) => ({ ...prev, layout: { ...prev.layout, [key]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setCustomizeMsg("");
    try {
      await updateThemeSettings(tokens);
      setCustomizeMsg("保存成功，刷新页面后生效");
    } catch {
      setCustomizeMsg("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTokens(activeTheme?.defaultTokens ?? defaultTokens);
  };

  // --- Install handlers ---
  const handleLoadPreview = async () => {
    if (!installUrl.trim()) return;
    setInstallLoading(true);
    setInstallMsg("");
    setInstallPreview(null);
    try {
      const theme = await themeManager.loadExternal(installUrl.trim());
      setInstallPreview({
        themeId: theme.manifest.id,
        name: theme.manifest.name,
        nameZh: theme.manifest.nameZh,
        description: theme.manifest.description,
        author: theme.manifest.author,
        version: theme.manifest.version,
      });
    } catch (e: any) {
      setInstallMsg(e.message || "加载失败");
    } finally {
      setInstallLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!installPreview) return;
    setInstallLoading(true);
    setInstallMsg("");
    try {
      await installTheme({
        themeId: installPreview.themeId,
        name: installPreview.name,
        nameZh: installPreview.nameZh,
        description: installPreview.description,
        author: installPreview.author,
        version: installPreview.version,
        source: "external",
        externalUrl: installUrl.trim(),
      });
      setInstallMsg("主题安装成功");
      setInstallPreview(null);
      setInstallUrl("");
      fetchInstalledThemes();
    } catch (e: any) {
      setInstallMsg(e.response?.data?.error || "安装失败");
    } finally {
      setInstallLoading(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "gallery", label: "主题库" },
    { id: "customize", label: "样式定制" },
    { id: "install", label: "安装主题" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">主题管理</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Gallery */}
      {activeTab === "gallery" && (
        <div>
          {galleryMsg && (
            <div className={`mb-4 p-3 rounded-md text-sm ${galleryMsg.includes("失败") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {galleryMsg}
            </div>
          )}

          {gallerLoading ? (
            <div className="py-12 text-center text-gray-500">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {installedThemes.map((theme) => (
                <div
                  key={theme.id}
                  className={`rounded-lg border-2 overflow-hidden transition-all ${
                    theme.isActive
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="h-[60px] w-full relative"
                    style={{ background: theme.preview || "linear-gradient(135deg, #667 0%, #999 100%)" }}
                  >
                    {theme.isActive && (
                      <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded">
                        当前主题
                      </span>
                    )}
                    {theme.source === "external" && (
                      <span className="absolute top-2 left-2 bg-purple-500 text-white text-xs font-medium px-2 py-0.5 rounded">
                        外部
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-900">{theme.nameZh || theme.name}</h4>
                      <span className="text-xs text-gray-400">v{theme.version}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{theme.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{theme.author}</span>
                      <div className="flex gap-2">
                        {theme.source === "external" && !theme.isActive && (
                          <button
                            onClick={() => handleUninstall(theme)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            卸载
                          </button>
                        )}
                        <button
                          onClick={() => handleActivate(theme)}
                          disabled={theme.isActive}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            theme.isActive
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {theme.isActive ? "已激活" : "激活"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customize */}
      {activeTab === "customize" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">样式定制</h3>
              <p className="text-sm text-gray-500">在主题基础上进一步调整颜色、字体和布局</p>
            </div>
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

          {customizeMsg && (
            <div className={`mb-4 p-3 rounded-md text-sm ${customizeMsg.includes("成功") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {customizeMsg}
            </div>
          )}

          {/* Token Presets */}
          {tokenPresets.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">预设方案</h3>
              <p className="text-sm text-gray-500 mb-4">选择一个预设快速应用，点击后仍需点击「保存设置」生效</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokenPresets.map((preset) => {
                  const active = tokens.colors.primary.toLowerCase() === preset.tokens.colors.primary.toLowerCase();
                  return (
                    <div
                      key={preset.id}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${
                        active ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="h-[40px] w-full" style={{ background: preset.preview }} />
                      <div className="p-3 flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{preset.nameZh || preset.name}</span>
                        <button
                          onClick={() => setTokens(preset.tokens)}
                          disabled={active}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            active ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {active ? "已应用" : "应用"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {customizeLoading ? (
            <div className="py-12 text-center text-gray-500">加载中...</div>
          ) : (
            <>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">正文字体 (Sans)</label>
                    <input
                      type="text"
                      value={tokens.fonts.sans}
                      onChange={(e) => handleFontChange("sans", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题字体 (Heading)</label>
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
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">布局</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最大宽度</label>
                    <input
                      type="text"
                      value={tokens.layout.maxWidth}
                      onChange={(e) => handleLayoutChange("maxWidth", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">圆角</label>
                    <input
                      type="text"
                      value={tokens.layout.borderRadius}
                      onChange={(e) => handleLayoutChange("borderRadius", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-lg shadow p-6">
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
            </>
          )}
        </div>
      )}

      {/* Tab 3: Install */}
      {activeTab === "install" && (
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">安装外部主题</h3>
            <p className="text-sm text-gray-500 mb-4">
              输入外部主题的 UMD bundle URL，加载预览后安装
            </p>

            {installMsg && (
              <div className={`mb-4 p-3 rounded-md text-sm ${installMsg.includes("成功") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {installMsg}
              </div>
            )}

            <div className="flex gap-3 mb-6">
              <input
                type="url"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
                placeholder="https://example.com/theme-bundle.umd.js"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleLoadPreview}
                disabled={installLoading || !installUrl.trim()}
                className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-900 disabled:opacity-50"
              >
                {installLoading ? "加载中..." : "加载预览"}
              </button>
            </div>

            {installPreview && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">{installPreview.nameZh || installPreview.name}</h4>
                <p className="text-sm text-gray-500 mb-2">{installPreview.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  <span>作者: {installPreview.author}</span>
                  <span>版本: {installPreview.version}</span>
                  <span>ID: {installPreview.themeId}</span>
                </div>
                <button
                  onClick={handleInstall}
                  disabled={installLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {installLoading ? "安装中..." : "安装主题"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
