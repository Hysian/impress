import { http } from "@/api/http";

export type MigrationFormat = "wordpress" | "halo" | "markdown";
export type MigrationJobStatus = "pending" | "running" | "completed" | "failed";

export interface MigrationJob {
  id: string;
  format: MigrationFormat;
  status: MigrationJobStatus;
  progress: number;
  total_items: number;
  imported_items: number;
  errors: string[];
  created_at: string;
}

export interface MigrationJobsResponse {
  jobs: MigrationJob[];
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function importData(
  file: File,
  format: MigrationFormat
): Promise<{ job_id: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", format);
  const response = await http.post<{ job_id: string; message: string }>(
    "/admin/migration/import",
    formData,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function getMigrationJobs(): Promise<MigrationJob[]> {
  const response = await http.get<MigrationJobsResponse>("/admin/migration/jobs", {
    headers: getAuthHeaders(),
  });
  return response.data.jobs || [];
}

export async function getMigrationJob(jobId: string): Promise<MigrationJob> {
  const response = await http.get<MigrationJob>(`/admin/migration/jobs/${jobId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export function createMigrationJobStream(jobId: string): EventSource {
  const accessToken = localStorage.getItem("accessToken");
  const url = `/admin/migration/jobs/${jobId}/stream${
    accessToken ? `?token=${encodeURIComponent(accessToken)}` : ""
  }`;
  return new EventSource(url);
}
