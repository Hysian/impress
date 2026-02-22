import { useState, useEffect, useCallback } from "react";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/api/analytics";

const PAGE_KEY_LABELS: Record<string, string> = {
  home: "首页",
  about: "关于我们",
  advantages: "核心优势",
  "core-services": "核心服务",
  cases: "成功案例",
  experts: "专家团队",
  contact: "联系我们",
  global: "全局配置",
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getAnalyticsSummary();
      setData(summary);
    } catch {
      setError("获取统计数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">访问统计</h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <SummaryCard label="今日访问" value={data.totals.today} />
            <SummaryCard label="近 7 天" value={data.totals.last7d} />
            <SummaryCard label="近 30 天" value={data.totals.last30d} />
          </div>

          {/* Detail Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    页面
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    今日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    近 7 天
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    近 30 天
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.pages.map((page) => (
                  <tr key={page.pageKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {PAGE_KEY_LABELS[page.pageKey] || page.pageKey}
                      <span className="ml-2 text-xs text-gray-400">{page.pageKey}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {page.today.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {page.last7d.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {page.last30d.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data.pages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      暂无访问数据
                    </td>
                  </tr>
                )}
                {data.pages.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      合计
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {data.totals.today.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {data.totals.last7d.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {data.totals.last30d.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}
