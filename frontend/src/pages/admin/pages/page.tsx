import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  listPages,
  deletePage,
  publishPage,
  unpublishPage,
  updatePage,
  type PageItem,
} from "@/api/pages";

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPages(statusFilter || undefined);
      setPages(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此页面？")) return;
    await deletePage(id);
    fetchPages();
  };

  const handleToggleStatus = async (page: PageItem) => {
    if (page.status === "published") {
      await unpublishPage(page.id);
    } else {
      await publishPage(page.id);
    }
    fetchPages();
  };

  const handleToggleNav = async (page: PageItem, field: "showInHeader" | "showInFooter") => {
    const current = page.navConfig?.[field] ?? false;
    await updatePage(page.id, {
      ...page,
      navConfig: { ...page.navConfig, [field]: !current },
    } as any);
    fetchPages();
  };

  const getEditLink = (page: PageItem) => {
    if (page.isThemePage && page.renderMode === "hardcoded" && page.contentKey) {
      return `/admin/content/editor/${page.contentKey}`;
    }
    return `/admin/pages/edit/${page.id}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">页面管理</h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          <Link
            to="/admin/pages/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            新建页面
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无页面</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  路径
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  导航
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{page.title?.zh || page.title?.en || "(无标题)"}</div>
                    {page.isThemePage && (
                      <span className="inline-flex mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                        {page.themeId === "corporate-classic" ? "企业经典" : page.themeId}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    /{page.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {page.isThemePage ? (
                      <span className="text-xs text-purple-600">{page.renderMode === "hardcoded" ? "主题页面" : "动态页面"}</span>
                    ) : (
                      <span className="text-xs text-gray-400">{page.template || "default"}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleNav(page, "showInHeader")}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          page.navConfig?.showInHeader
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                        title="显示在页眉导航"
                      >
                        页眉
                      </button>
                      <button
                        onClick={() => handleToggleNav(page, "showInFooter")}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          page.navConfig?.showInFooter
                            ? "bg-green-50 border-green-300 text-green-700"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                        title="显示在页脚导航"
                      >
                        页脚
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        page.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {page.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button
                      onClick={() => handleToggleStatus(page)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {page.status === "published" ? "下线" : "发布"}
                    </button>
                    <Link
                      to={getEditLink(page)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
