import { useState, useEffect, useCallback } from "react";
import { getSystemStatus, type SystemStatus } from "@/api/system";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days} 天 ${hours} 时 ${minutes} 分`;
  if (hours > 0) return `${hours} 时 ${minutes} 分 ${secs} 秒`;
  if (minutes > 0) return `${minutes} 分 ${secs} 秒`;
  return `${secs} 秒`;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function barColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-base font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await getSystemStatus();
      setData(status);
      setLastUpdated(new Date());
    } catch {
      setError("获取系统状态失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const memUsedPct = data ? Math.min(100, (data.memory.allocMB / data.memory.sysMB) * 100) : 0;
  const diskUsedPct = data?.disk ? Math.min(100, (data.disk.usedMB / data.disk.totalMB) * 100) : 0;
  const dbConnPct = data?.database ? Math.min(100, (data.database.openConnections / data.database.maxConnections) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">系统状态</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              最后更新：{lastUpdated.toLocaleTimeString("zh-CN")}（每 10 秒自动刷新）
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Runtime */}
          <InfoCard title="运行时信息">
            <Row label="Go 版本" value={data.runtime.goVersion} />
            <Row label="操作系统" value={data.runtime.os} />
            <Row label="架构" value={data.runtime.arch} />
            <Row label="CPU 核心数" value={data.runtime.cpuCount} />
            <Row label="Goroutines" value={data.runtime.goroutines} />
            <Row label="运行时长" value={formatUptime(data.runtime.uptime)} />
          </InfoCard>

          {/* Memory */}
          <InfoCard title="内存使用">
            <Row label="当前分配" value={`${data.memory.allocMB.toFixed(1)} MB`} />
            <Row label="历史累计分配" value={`${data.memory.totalAllocMB.toFixed(1)} MB`} />
            <Row label="系统申请" value={`${data.memory.sysMB.toFixed(1)} MB`} />
            <Row label="GC 暂停" value={`${data.memory.gcPauseMs.toFixed(3)} ms`} />
            <div className="pt-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>内存占用</span>
                <span>{memUsedPct.toFixed(1)}%</span>
              </div>
              <ProgressBar value={data.memory.allocMB} max={data.memory.sysMB} color={barColor(memUsedPct)} />
            </div>
          </InfoCard>

          {/* Database */}
          {data.database && (
            <InfoCard title="数据库">
              <Row label="类型" value={data.database.type} />
              <Row label="当前连接数" value={data.database.openConnections} />
              <Row label="最大连接数" value={data.database.maxConnections} />
              <div className="pt-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>连接池占用</span>
                  <span>{dbConnPct.toFixed(1)}%</span>
                </div>
                <ProgressBar
                  value={data.database.openConnections}
                  max={data.database.maxConnections}
                  color={barColor(dbConnPct)}
                />
              </div>
            </InfoCard>
          )}

          {/* Disk */}
          {data.disk && (
            <InfoCard title="磁盘使用">
              <Row label="总容量" value={`${data.disk.totalMB.toFixed(0)} MB`} />
              <Row label="已使用" value={`${data.disk.usedMB.toFixed(0)} MB`} />
              <Row label="可用" value={`${data.disk.freeMB.toFixed(0)} MB`} />
              <div className="pt-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>磁盘占用</span>
                  <span>{diskUsedPct.toFixed(1)}%</span>
                </div>
                <ProgressBar
                  value={data.disk.usedMB}
                  max={data.disk.totalMB}
                  color={barColor(diskUsedPct)}
                />
              </div>
            </InfoCard>
          )}

        </div>
      ) : null}
    </div>
  );
}
