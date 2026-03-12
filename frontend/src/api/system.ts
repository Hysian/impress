import { http } from "./http";

export interface SystemStatus {
  runtime: { goVersion: string; os: string; arch: string; cpuCount: number; goroutines: number; uptime: number };
  memory: { allocMB: number; totalAllocMB: number; sysMB: number; gcPauseMs: number };
  database?: { type: string; openConnections: number; maxConnections: number };
  disk?: { totalMB: number; usedMB: number; freeMB: number };
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const resp = await http.get<SystemStatus>("/admin/system/status", { headers: getAuthHeaders() });
  return resp.data;
}
