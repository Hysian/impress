import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface DraftConfig {
  [key: string]: unknown;
}

interface ContentDocument {
  pageKey: string;
  draftConfig: DraftConfig;
  draftVersion: number;
  updatedAt: string;
}

export default function ContentEditorPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const navigate = useNavigate();
  const { refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ContentDocument | null>(null);
  const [config, setConfig] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedVersion, setLastSavedVersion] = useState<number | null>(null);

  const pageLabels: Record<string, string> = {
    "home": "首页",
    "about": "关于我们",
    "advantages": "优势",
    "core-services": "核心服务",
    "cases": "案例",
    "experts": "专家",
    "contact": "联系方式",
    "global": "全局配置",
  };

  const loadDraft = useCallback(async () => {
    if (!pageKey) return;

    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await fetch(`/admin/content/${pageKey}/draft`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        await refreshToken();
        return loadDraft();
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "加载草稿失败");
      }

      const data: ContentDocument = await response.json();
      setDocument(data);
      setConfig(JSON.stringify(data.draftConfig, null, 2));
      setLastSavedVersion(data.draftVersion);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载草稿失败");
    } finally {
      setLoading(false);
    }
  }, [pageKey, refreshToken]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const saveDraft = async () => {
    if (!pageKey || !document) return;

    setSaving(true);
    setError(null);

    try {
      const parsedConfig = JSON.parse(config);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await fetch(`/admin/content/${pageKey}/draft`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "If-Match": lastSavedVersion?.toString() || document.draftVersion.toString(),
        },
        body: JSON.stringify({
          config: parsedConfig,
          changeNote: `更新草稿 ${pageLabels[pageKey] || pageKey}`,
        }),
      });

      if (response.status === 401) {
        await refreshToken();
        return saveDraft();
      }

      if (response.status === 409) {
        const errorData = await response.json();
        throw new Error(`版本冲突：${errorData.error?.message || "其他用户已修改此页面，请刷新后重试"}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "保存草稿失败");
      }

      const data = await response.json();
      setLastSavedVersion(data.version);
      setDocument({
        ...document,
        draftVersion: data.version,
        updatedAt: data.updatedAt,
      });
      setIsDirty(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON 格式错误");
      } else {
        setError(err instanceof Error ? err.message : "保存草稿失败");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (value: string) => {
    setConfig(value);
    setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error || "页面不存在"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin/content")}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            编辑 {pageLabels[pageKey!] || pageKey}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            草稿版本: {document.draftVersion} | 最后更新: {new Date(document.updatedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <span className="text-sm text-orange-600">未保存的更改</span>
          )}
          <button
            onClick={loadDraft}
            disabled={loading || saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            刷新
          </button>
          <button
            onClick={saveDraft}
            disabled={!isDirty || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "保存草稿"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">配置编辑器</h2>
          <p className="text-sm text-gray-600">
            编辑页面配置（JSON 格式）。支持中英文双语字段，格式示例：
            <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
              {"{ \"zh\": \"中文\", \"en\": \"English\" }"}
            </code>
          </p>
        </div>

        <textarea
          value={config}
          onChange={(e) => handleConfigChange(e.target.value)}
          className="w-full h-96 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="输入 JSON 配置..."
          spellCheck={false}
        />

        <div className="mt-4 text-xs text-gray-500">
          提示：保存前请确保 JSON 格式正确。双语字段应包含 zh 和 en 属性。
        </div>
      </div>
    </div>
  );
}
