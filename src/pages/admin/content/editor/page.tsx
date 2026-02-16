import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { http } from "@/api/http";
import { getPageSchema } from "@/schemas";
import { FieldRenderer } from "@/components/admin/form-fields";

interface DraftConfig {
  [key: string]: unknown;
}

interface ContentDocument {
  pageKey: string;
  draftConfig: DraftConfig;
  draftVersion: number;
  publishedVersion?: number;
  updatedAt: string;
}

interface ValidationError {
  path: string;
  code: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  translationStatus: Record<string, "missing" | "stale" | "done">;
}

interface ContentVersion {
  version: number;
  changeNote: string;
  operator: string;
  createdAt: string;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

interface SaveDraftResponse {
  version: number;
  updatedAt: string;
}

interface PublishResponse {
  publishedVersion: number;
}

interface RollbackResponse {
  publishedVersion: number;
  sourceVersion: number;
}

interface VersionHistoryResponse {
  items?: ContentVersion[];
}

type EditorMode = "form" | "json";

export default function ContentEditorPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const navigate = useNavigate();
  const { refreshToken, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<ContentDocument | null>(null);
  const [config, setConfig] = useState<string>("");
  const [formData, setFormData] = useState<DraftConfig>({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedVersion, setLastSavedVersion] = useState<number | null>(null);

  // Editor mode
  const [editorMode, setEditorMode] = useState<EditorMode>("form");
  const schema = pageKey ? getPageSchema(pageKey) : undefined;

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
  const [rollbackNote, setRollbackNote] = useState("");

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

      const response = await http.get<ContentDocument | ApiErrorResponse>(`/admin/content/${pageKey}/draft`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return loadDraft();
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "加载草稿失败");
      }

      const data = response.data as ContentDocument;
      setDocument(data);
      setConfig(JSON.stringify(data.draftConfig, null, 2));
      setFormData(data.draftConfig || {});
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

  // Sync between modes on switch
  const switchMode = (mode: EditorMode) => {
    if (mode === editorMode) return;

    if (mode === "json") {
      // Form → JSON: serialize formData
      setConfig(JSON.stringify(formData, null, 2));
    } else {
      // JSON → Form: parse JSON string
      try {
        const parsed = JSON.parse(config);
        setFormData(parsed);
      } catch {
        setError("JSON 格式错误，无法切换到表单模式。请先修正 JSON。");
        return;
      }
    }
    setEditorMode(mode);
  };

  const getConfigForSave = (): DraftConfig => {
    if (editorMode === "form") {
      return formData;
    }
    return JSON.parse(config);
  };

  const saveDraft = async () => {
    if (!pageKey || !document) return;

    setSaving(true);
    setError(null);

    try {
      const parsedConfig = getConfigForSave();

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await http.put<SaveDraftResponse | ApiErrorResponse>(`/admin/content/${pageKey}/draft`, {
        config: parsedConfig,
        changeNote: `更新草稿 ${pageLabels[pageKey] || pageKey}`,
      }, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "If-Match": lastSavedVersion?.toString() || document.draftVersion.toString(),
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return saveDraft();
      }

      if (response.status === 409) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(`版本冲突：${errorData.error?.message || "其他用户已修改此页面，请刷新后重试"}`);
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "保存草稿失败");
      }

      const data = response.data as SaveDraftResponse;
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
    setValidationResult(null);
    setPublishSuccess(null);
  };

  const handleFormDataChange = (newData: DraftConfig) => {
    setFormData(newData);
    setIsDirty(true);
    setValidationResult(null);
    setPublishSuccess(null);
  };

  const validateDraft = async () => {
    if (!pageKey) return;

    setValidating(true);
    setError(null);
    setPublishSuccess(null);

    try {
      const parsedConfig = getConfigForSave();

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await http.post<ValidationResult | ApiErrorResponse>(`/admin/content/${pageKey}/validate`, {
        config: parsedConfig,
      }, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return validateDraft();
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "验证失败");
      }

      const result = response.data as ValidationResult;
      setValidationResult(result);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON 格式错误，无法验证");
      } else {
        setError(err instanceof Error ? err.message : "验证失败");
      }
    } finally {
      setValidating(false);
    }
  };

  const publishDraft = async () => {
    if (!pageKey || !document) return;
    if (user?.role !== "admin") {
      setError("只有管理员可以发布内容");
      return;
    }

    setPublishing(true);
    setError(null);
    setPublishSuccess(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await http.post<PublishResponse | ApiErrorResponse>(`/admin/content/${pageKey}/publish`, {
        expectedDraftVersion: document.draftVersion,
        changeNote: `发布 ${pageLabels[pageKey] || pageKey}`,
      }, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return publishDraft();
      }

      if (response.status === 422) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(`发布被阻止：${errorData.error?.message || "存在未完成的翻译或验证错误"}`);
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "发布失败");
      }

      const data = response.data as PublishResponse;
      setPublishSuccess(`发布成功！版本：${data.publishedVersion}`);
      setValidationResult(null);
      await loadDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const loadVersionHistory = async () => {
    if (!pageKey) return;

    setLoadingVersions(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await http.get<VersionHistoryResponse | ApiErrorResponse>(`/admin/content/${pageKey}/versions`, {
        params: {
          page: 1,
          pageSize: 20,
        },
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return loadVersionHistory();
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "加载版本历史失败");
      }

      const data = response.data as VersionHistoryResponse;
      setVersions(data.items || []);
      setShowVersionHistory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载版本历史失败");
    } finally {
      setLoadingVersions(false);
    }
  };

  const rollbackToVersion = async (version: number) => {
    if (!pageKey) return;
    if (user?.role !== "admin") {
      setError("只有管理员可以回滚内容");
      return;
    }

    if (!rollbackNote.trim()) {
      setError("请填写回滚说明");
      return;
    }

    setPublishing(true);
    setError(null);
    setPublishSuccess(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("未登录");
      }

      const response = await http.post<RollbackResponse | ApiErrorResponse>(`/admin/content/${pageKey}/rollback/${version}`, {
        changeNote: rollbackNote,
      }, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      });

      if (response.status === 401) {
        await refreshToken();
        return rollbackToVersion(version);
      }

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.data as ApiErrorResponse;
        throw new Error(errorData.error?.message || "回滚失败");
      }

      const data = response.data as RollbackResponse;
      setPublishSuccess(`回滚成功！已创建新版本：${data.publishedVersion}（从版本 ${data.sourceVersion} 回滚）`);
      setShowVersionHistory(false);
      setSelectedVersion(null);
      setRollbackNote("");
      await loadDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "回滚失败");
    } finally {
      setPublishing(false);
    }
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
            草稿版本: {document.draftVersion} |
            发布版本: {document.publishedVersion || "未发布"} |
            最后更新: {new Date(document.updatedAt).toLocaleString("zh-CN")}
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

      {publishSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {publishSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            {/* Mode switch */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">配置编辑器</h2>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => switchMode("form")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    editorMode === "form"
                      ? "bg-white text-blue-700 shadow-sm font-medium"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  表单模式
                </button>
                <button
                  onClick={() => switchMode("json")}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    editorMode === "json"
                      ? "bg-white text-blue-700 shadow-sm font-medium"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  JSON 模式
                </button>
              </div>
            </div>

            {editorMode === "form" && schema ? (
              <div className="space-y-6">
                {Object.entries(schema.fields).map(([key, descriptor]) => (
                  <FieldRenderer
                    key={key}
                    descriptor={descriptor}
                    value={formData[key]}
                    onChange={(v) => {
                      handleFormDataChange({ ...formData, [key]: v });
                    }}
                    path={key}
                  />
                ))}
              </div>
            ) : editorMode === "form" && !schema ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">该页面暂无预设 Schema，请使用 JSON 模式编辑</p>
                <button
                  onClick={() => setEditorMode("json")}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  切换到 JSON 模式
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  编辑页面配置（JSON 格式）。支持中英文双语字段，格式示例：
                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    {"{ \"zh\": \"中文\", \"en\": \"English\" }"}
                  </code>
                </p>
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
              </>
            )}
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          {/* Validation Panel */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">验证与发布</h2>

            <button
              onClick={validateDraft}
              disabled={validating || isDirty}
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? "验证中..." : "验证配置"}
            </button>

            {isDirty && (
              <p className="text-xs text-orange-600 mb-4">
                请先保存草稿再验证
              </p>
            )}

            {validationResult && (
              <div className="mb-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">
                    验证结果
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${validationResult.valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {validationResult.valid ? "通过" : "失败"}
                  </span>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">字段错误：</p>
                    <ul className="text-xs space-y-1">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx} className="text-red-600">
                          <span className="font-mono bg-red-50 px-1 rounded">{err.path}</span>: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Object.keys(validationResult.translationStatus).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">翻译状态：</p>
                    <ul className="text-xs space-y-1">
                      {Object.entries(validationResult.translationStatus).map(([path, status]) => (
                        <li key={path} className="flex items-center justify-between">
                          <span className="font-mono text-gray-700">{path}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            status === "done" ? "bg-green-100 text-green-800" :
                            status === "missing" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {status === "done" ? "完成" : status === "missing" ? "缺失" : "过期"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={publishDraft}
              disabled={publishing || isDirty || (validationResult && !validationResult.valid) || user?.role !== "admin"}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? "发布中..." : "发布到生产环境"}
            </button>

            {user?.role !== "admin" && (
              <p className="text-xs text-gray-500 mt-2">
                仅管理员可以发布内容
              </p>
            )}
          </div>

          {/* Version History Panel */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">版本历史</h2>

            <button
              onClick={loadVersionHistory}
              disabled={loadingVersions}
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingVersions ? "加载中..." : "查看版本历史"}
            </button>

            {showVersionHistory && (
              <div>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无版本历史</p>
                ) : (
                  <ul className="space-y-3 max-h-96 overflow-y-auto">
                    {versions.map((ver) => (
                      <li key={ver.version} className="p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold text-sm">v{ver.version}</span>
                          <button
                            onClick={() => setSelectedVersion(selectedVersion?.version === ver.version ? null : ver)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {selectedVersion?.version === ver.version ? "取消" : "回滚"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{ver.changeNote}</p>
                        <p className="text-xs text-gray-500">
                          {ver.operator} • {new Date(ver.createdAt).toLocaleString("zh-CN")}
                        </p>

                        {selectedVersion?.version === ver.version && (
                          <div className="mt-3 pt-3 border-t">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              回滚说明：
                            </label>
                            <textarea
                              value={rollbackNote}
                              onChange={(e) => setRollbackNote(e.target.value)}
                              placeholder="请输入回滚原因..."
                              className="w-full text-xs p-2 border border-gray-300 rounded mb-2"
                              rows={2}
                            />
                            <button
                              onClick={() => rollbackToVersion(ver.version)}
                              disabled={publishing || !rollbackNote.trim() || user?.role !== "admin"}
                              className="w-full px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {publishing ? "回滚中..." : "确认回滚"}
                            </button>
                            {user?.role !== "admin" && (
                              <p className="text-xs text-gray-500 mt-1">
                                仅管理员可以回滚
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
