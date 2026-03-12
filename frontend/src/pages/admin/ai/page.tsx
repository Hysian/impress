import { useState, useEffect } from "react";
import {
  getAIConfig,
  updateAIConfig,
  summarizeText,
  suggestTitles,
  suggestTags,
  type AIConfig,
  type UpdateAIConfigRequest,
} from "@/api/ai";

type PlaygroundTab = "summarize" | "titles" | "tags";

export default function AdminAIPage() {
  // Config state
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [provider, setProvider] = useState<"openai" | "anthropic" | "noop">("noop");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Playground state
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("summarize");

  // Summarize tab
  const [summarizeText_, setSummarizeText] = useState("");
  const [summarizeMaxLength, setSummarizeMaxLength] = useState(200);
  const [summarizeResult, setSummarizeResult] = useState("");
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [summarizeError, setSummarizeError] = useState("");

  // Suggest titles tab
  const [titlesContent, setTitlesContent] = useState("");
  const [titlesCount, setTitlesCount] = useState(5);
  const [titlesResult, setTitlesResult] = useState<string[]>([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [titlesError, setTitlesError] = useState("");

  // Suggest tags tab
  const [tagsContent, setTagsContent] = useState("");
  const [tagsResult, setTagsResult] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setConfigLoading(true);
    setConfigError("");
    try {
      const data = await getAIConfig();
      setConfig(data);
      setProvider(data.provider);
      setApiKey(data.api_key ?? "");
      setBaseUrl(data.base_url ?? "");
      setModel(data.model ?? "");
    } catch {
      setConfigError("加载 AI 配置失败");
    } finally {
      setConfigLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSaving(true);
    setConfigError("");
    setConfigSuccess("");
    try {
      const req: UpdateAIConfigRequest = { provider };
      if (apiKey.trim()) req.api_key = apiKey.trim();
      if (baseUrl.trim()) req.base_url = baseUrl.trim();
      if (model.trim()) req.model = model.trim();
      const updated = await updateAIConfig(req);
      setConfig(updated);
      setConfigSuccess("配置已保存");
      setTimeout(() => setConfigSuccess(""), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "保存配置失败";
      setConfigError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSummarize() {
    if (!summarizeText_.trim()) return;
    setSummarizeLoading(true);
    setSummarizeError("");
    setSummarizeResult("");
    try {
      const res = await summarizeText({ text: summarizeText_, max_length: summarizeMaxLength });
      setSummarizeResult(res.summary);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "摘要生成失败";
      setSummarizeError(msg);
    } finally {
      setSummarizeLoading(false);
    }
  }

  async function handleSuggestTitles() {
    if (!titlesContent.trim()) return;
    setTitlesLoading(true);
    setTitlesError("");
    setTitlesResult([]);
    try {
      const res = await suggestTitles({ content: titlesContent, count: titlesCount });
      setTitlesResult(res.titles);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "标题建议失败";
      setTitlesError(msg);
    } finally {
      setTitlesLoading(false);
    }
  }

  async function handleSuggestTags() {
    if (!tagsContent.trim()) return;
    setTagsLoading(true);
    setTagsError("");
    setTagsResult([]);
    try {
      const res = await suggestTags({ content: tagsContent, existing_tags: [] });
      setTagsResult(res.tags);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "标签建议失败";
      setTagsError(msg);
    } finally {
      setTagsLoading(false);
    }
  }

  const providerLabels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    noop: "无（禁用）",
  };

  const tabs: { key: PlaygroundTab; label: string }[] = [
    { key: "summarize", label: "生成摘要" },
    { key: "titles", label: "建议标题" },
    { key: "tags", label: "建议标签" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 助手</h1>
          <p className="mt-1 text-sm text-gray-500">配置 AI 服务提供商，并在此测试 AI 功能</p>
        </div>
        {config && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${config.enabled ? "bg-green-500" : "bg-gray-400"}`}
            />
            <span className="text-sm text-gray-600">
              {config.enabled ? "已启用" : "未启用"}
            </span>
          </div>
        )}
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">AI 服务配置</h2>
        </div>
        <div className="p-6">
          {configLoading ? (
            <div className="text-sm text-gray-500 py-4 text-center">加载中...</div>
          ) : (
            <div className="space-y-5">
              {configError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{configError}</div>
              )}
              {configSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{configSuccess}</div>
              )}

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  服务提供商
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "openai" | "anthropic" | "noop")}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="noop">无（禁用）</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                {config && (
                  <p className="mt-1 text-xs text-gray-500">
                    当前：{providerLabels[config.provider] ?? config.provider}
                  </p>
                )}
              </div>

              {provider !== "noop" && (
                <>
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API 密钥
                    </label>
                    <div className="relative w-full sm:w-96">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title={showApiKey ? "隐藏密钥" : "显示密钥"}
                      >
                        {showApiKey ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API 基础 URL <span className="text-gray-400 font-normal">（可选，留空使用默认）</span>
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full sm:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      模型名称 <span className="text-gray-400 font-normal">（可选）</span>
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={provider === "openai" ? "gpt-4o-mini" : "claude-3-haiku-20240307"}
                      className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "保存中..." : "保存配置"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playground Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">AI 工具测试台</h2>
          <p className="mt-0.5 text-xs text-gray-500">在此测试 AI 功能效果</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Summarize Tab */}
          {activeTab === "summarize" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  输入文本
                </label>
                <textarea
                  value={summarizeText_}
                  onChange={(e) => setSummarizeText(e.target.value)}
                  rows={6}
                  placeholder="粘贴需要摘要的文章内容..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    摘要最大字数
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1000}
                    value={summarizeMaxLength}
                    onChange={(e) => setSummarizeMaxLength(Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleSummarize}
                    disabled={summarizeLoading || !summarizeText_.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {summarizeLoading ? "生成中..." : "生成摘要"}
                  </button>
                </div>
              </div>
              {summarizeError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{summarizeError}</div>
              )}
              {summarizeResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">摘要结果</label>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-800 leading-relaxed border border-gray-200">
                    {summarizeResult}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggest Titles Tab */}
          {activeTab === "titles" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文章内容
                </label>
                <textarea
                  value={titlesContent}
                  onChange={(e) => setTitlesContent(e.target.value)}
                  rows={6}
                  placeholder="粘贴文章内容，AI 将为您推荐标题..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    建议数量
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={titlesCount}
                    onChange={(e) => setTitlesCount(Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="pt-6">
                  <button
                    onClick={handleSuggestTitles}
                    disabled={titlesLoading || !titlesContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {titlesLoading ? "生成中..." : "建议标题"}
                  </button>
                </div>
              </div>
              {titlesError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{titlesError}</div>
              )}
              {titlesResult.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建议标题</label>
                  <ul className="space-y-2">
                    {titlesResult.map((title, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-800">{title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Suggest Tags Tab */}
          {activeTab === "tags" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文章内容
                </label>
                <textarea
                  value={tagsContent}
                  onChange={(e) => setTagsContent(e.target.value)}
                  rows={6}
                  placeholder="粘贴文章内容，AI 将为您推荐标签..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
                />
              </div>
              <button
                onClick={handleSuggestTags}
                disabled={tagsLoading || !tagsContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {tagsLoading ? "生成中..." : "建议标签"}
              </button>
              {tagsError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{tagsError}</div>
              )}
              {tagsResult.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建议标签</label>
                  <div className="flex flex-wrap gap-2">
                    {tagsResult.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
