import { useState, useEffect, useCallback } from "react";
import {
  listSites,
  createSite,
  updateSite,
  deleteSite,
  exportSite,
  importSite,
  type SiteDTO,
  type CreateSiteRequest,
  type UpdateSiteRequest,
} from "@/api/sites";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface SiteFormData {
  name: string;
  domain: string;
  sub_path: string;
  locale: string;
  mode: string;
  status: string;
}

const emptyForm: SiteFormData = {
  name: "",
  domain: "",
  sub_path: "",
  locale: "zh",
  mode: "subdomain",
  status: "active",
};

const LOCALES = [
  { value: "zh", label: "中文 (zh)" },
  { value: "en", label: "English (en)" },
];

const MODES = [
  { value: "subdomain", label: "子域名" },
  { value: "subpath", label: "子路径" },
];

const STATUSES = [
  { value: "active", label: "启用" },
  { value: "inactive", label: "禁用" },
  { value: "maintenance", label: "维护中" },
];

export default function AdminSitesPage() {
  useDocumentTitle("站点管理");
  const [sites, setSites] = useState<SiteDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteDTO | null>(null);
  const [form, setForm] = useState<SiteFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<SiteDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [exportingId, setExportingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSites();
      setSites(data.items);
      setTotal(data.total);
    } catch {
      setError("加载站点列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const openCreate = () => {
    setEditingSite(null);
    setForm(emptyForm);
    setFormError("");
    setShowDialog(true);
  };

  const openEdit = (site: SiteDTO) => {
    setEditingSite(site);
    setForm({
      name: site.name,
      domain: site.domain,
      sub_path: site.sub_path,
      locale: site.locale,
      mode: site.mode,
      status: site.status,
    });
    setFormError("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.name.trim()) {
      setFormError("请输入站点名称");
      return;
    }
    if (!form.domain.trim()) {
      setFormError("请输入域名");
      return;
    }
    setSaving(true);
    try {
      if (editingSite) {
        const data: UpdateSiteRequest = {
          name: form.name,
          domain: form.domain,
          sub_path: form.sub_path,
          locale: form.locale,
          mode: form.mode,
          status: form.status,
        };
        await updateSite(editingSite.id, data);
      } else {
        const data: CreateSiteRequest = {
          name: form.name,
          domain: form.domain,
          sub_path: form.sub_path,
          locale: form.locale,
          mode: form.mode,
          status: form.status,
        };
        await createSite(data);
      }
      setShowDialog(false);
      fetchSites();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "保存失败";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSite(deleteTarget.id);
      setDeleteTarget(null);
      fetchSites();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "删除失败";
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (site: SiteDTO) => {
    setExportingId(site.id);
    try {
      const blob = await exportSite(site.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `site-${site.name}-export.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "导出失败";
      alert(msg);
    } finally {
      setExportingId(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importSite(file);
      fetchSites();
      alert("导入成功");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "导入失败";
      alert(msg);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">启用</span>;
      case "inactive":
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">禁用</span>;
      case "maintenance":
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">维护中</span>;
      default:
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "subdomain":
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">子域名</span>;
      case "subpath":
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">子路径</span>;
      default:
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{mode}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">站点管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 个站点</p>
        </div>
        <div className="flex items-center gap-3">
          <label className={`px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            {importing ? "导入中..." : "导入站点"}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建站点
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">站点名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">域名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模式</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">语言</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : sites.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">暂无站点</td>
              </tr>
            ) : (
              sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{site.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>
                      <span className="font-mono">{site.domain}</span>
                      {site.sub_path && (
                        <span className="text-gray-400 font-mono ml-1">{site.sub_path}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{getModeBadge(site.mode)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{site.locale.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(site.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(site.created_at).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleExport(site)}
                      disabled={exportingId === site.id}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      {exportingId === site.id ? "导出中..." : "导出"}
                    </button>
                    <button
                      onClick={() => openEdit(site)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteTarget(site)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingSite ? "编辑站点" : "创建站点"}
              </h2>

              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">站点名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入站点名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">域名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="如: example.com"
                />
              </div>

              {/* Mode selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">访问模式</label>
                <div className="flex gap-4">
                  {MODES.map((m) => (
                    <label key={m.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value={m.value}
                        checked={form.mode === m.value}
                        onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.mode === "subpath" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">子路径</label>
                  <input
                    type="text"
                    value={form.sub_path}
                    onChange={(e) => setForm((f) => ({ ...f, sub_path: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="如: /site1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认语言</label>
                <select
                  value={form.locale}
                  onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {LOCALES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">确认删除</h2>
            <p className="text-sm text-gray-600">
              确定要删除站点 <strong>{deleteTarget.name}</strong> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
