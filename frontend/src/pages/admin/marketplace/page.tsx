import { useState, useEffect, useCallback } from "react";
import {
  getMarketplaceItems,
  getInstalledItems,
  installItem,
  uninstallItem,
  type MarketplaceItem,
  type InstalledItem,
} from "@/api/marketplace";

type TabKey = "browse" | "installed";

const tabs: { key: TabKey; label: string }[] = [
  { key: "browse", label: "市场浏览" },
  { key: "installed", label: "已安装" },
];

const categoryOptions = [
  { value: "", label: "全部分类" },
  { value: "seo", label: "SEO" },
  { value: "analytics", label: "统计分析" },
  { value: "social", label: "社交" },
  { value: "security", label: "安全" },
  { value: "utility", label: "工具" },
];

const typeOptions = [
  { value: "", label: "全部类型" },
  { value: "plugin", label: "插件" },
  { value: "theme", label: "主题" },
];

// ---- Confirm Dialog ----
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmClass = "bg-blue-600 hover:bg-blue-700",
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? "处理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Plugin Card ----
function PluginCard({
  item,
  onInstall,
  onUninstall,
}: {
  item: MarketplaceItem;
  onInstall: (item: MarketplaceItem) => void;
  onUninstall: (item: MarketplaceItem) => void;
}) {
  const isInstalled = item.status === "installed" || item.status === "update_available";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        {item.icon_url ? (
          <img
            src={item.icon_url}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
            <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 shrink-0">
              {item.type === "plugin" ? "插件" : "主题"}
            </span>
            {item.status === "update_available" && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 shrink-0">
                有更新
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">by {item.author}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 flex-1">{item.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>v{item.version}</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {item.downloads.toLocaleString()}
          </span>
        </div>
        {isInstalled ? (
          <button
            onClick={() => onUninstall(item)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            卸载
          </button>
        ) : (
          <button
            onClick={() => onInstall(item)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            安装
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Browse Tab ----
function BrowseTab() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const [confirmInstall, setConfirmInstall] = useState<MarketplaceItem | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<MarketplaceItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarketplaceItems({
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError("获取市场数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, search, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleInstall = async () => {
    if (!confirmInstall) return;
    setActionLoading(true);
    try {
      await installItem(confirmInstall.slug);
      setSuccessMsg(`"${confirmInstall.name}" 安装成功`);
      setConfirmInstall(null);
      fetchItems();
    } catch {
      setError(`安装 "${confirmInstall.name}" 失败`);
      setConfirmInstall(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setActionLoading(true);
    try {
      await uninstallItem(confirmUninstall.slug);
      setSuccessMsg(`"${confirmUninstall.name}" 已卸载`);
      setConfirmUninstall(null);
      fetchItems();
    } catch {
      setError(`卸载 "${confirmUninstall.name}" 失败`);
      setConfirmUninstall(null);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索插件或主题..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            搜索
          </button>
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm">暂无可用的插件或主题</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {items.map((item) => (
              <PluginCard
                key={item.slug}
                item={item}
                onInstall={setConfirmInstall}
                onUninstall={setConfirmUninstall}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>共 {total} 个结果</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmInstall}
        title="确认安装"
        message={`确定要安装 "${confirmInstall?.name}" (v${confirmInstall?.version}) 吗？`}
        confirmLabel="安装"
        confirmClass="bg-blue-600 hover:bg-blue-700"
        onConfirm={handleInstall}
        onCancel={() => setConfirmInstall(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={!!confirmUninstall}
        title="确认卸载"
        message={`确定要卸载 "${confirmUninstall?.name}" 吗？此操作无法撤销。`}
        confirmLabel="卸载"
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleUninstall}
        onCancel={() => setConfirmUninstall(null)}
        loading={actionLoading}
      />
    </div>
  );
}

// ---- Installed Tab ----
function InstalledTab() {
  const [items, setItems] = useState<InstalledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInstalled = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstalledItems();
      setItems(data);
    } catch {
      setError("获取已安装列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstalled();
  }, [fetchInstalled]);

  const handleUninstall = async () => {
    if (!confirmUninstall) return;
    setActionLoading(true);
    try {
      await uninstallItem(confirmUninstall.slug);
      setSuccessMsg(`"${confirmUninstall.name}" 已卸载`);
      setConfirmUninstall(null);
      fetchInstalled();
    } catch {
      setError(`卸载 "${confirmUninstall.name}" 失败`);
      setConfirmUninstall(null);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: InstalledItem["status"]) => {
    const map = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-600",
      error: "bg-red-100 text-red-700",
    };
    const labels = { active: "启用", inactive: "禁用", error: "异常" };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${map[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div>
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  版本
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  安装时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.slug} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.type === "plugin" ? "插件" : "主题"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    v{item.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.installed_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setConfirmUninstall(item)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      卸载
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                    暂无已安装的插件或主题
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmUninstall}
        title="确认卸载"
        message={`确定要卸载 "${confirmUninstall?.name}" 吗？此操作无法撤销。`}
        confirmLabel="卸载"
        confirmClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleUninstall}
        onCancel={() => setConfirmUninstall(null)}
        loading={actionLoading}
      />
    </div>
  );
}

// ---- Main Page ----
export default function AdminMarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("browse");

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">应用市场</h2>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "browse" && <BrowseTab />}
      {activeTab === "installed" && <InstalledTab />}
    </div>
  );
}
