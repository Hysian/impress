import { useState, useEffect, useCallback } from "react";
import { getBackups, triggerBackup, type BackupRecord } from "@/api/backups";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminBackupsPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBackups();
      setBackups(data);
    } catch {
      setError("获取备份列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleTriggerBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const newBackup = await triggerBackup();
      setSuccessMsg(`备份创建成功: ${newBackup.filename}`);
      await fetchBackups();
    } catch {
      setError("创建备份失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">备份管理</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTriggerBackup}
            disabled={creating}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? "创建中..." : "手动备份"}
          </button>
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "加载中..." : "刷新"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && backups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {backup.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    {formatFileSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    {new Date(backup.createdAt).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                    暂无备份记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
