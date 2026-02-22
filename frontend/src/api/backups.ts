import { http } from "@/api/http";

export interface BackupRecord {
  id: number;
  filename: string;
  size: number;
  createdAt: string;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getBackups(): Promise<BackupRecord[]> {
  const response = await http.get<{ items: BackupRecord[] }>("/admin/backups", {
    headers: getAuthHeaders(),
  });
  return response.data.items || [];
}

export async function triggerBackup(): Promise<BackupRecord> {
  const response = await http.post<BackupRecord>("/admin/backups", null, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
