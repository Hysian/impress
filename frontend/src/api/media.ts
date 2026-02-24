import { http } from "@/api/http";

export interface MediaItem {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
}

interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function uploadMedia(file: File | Blob, filename?: string): Promise<MediaItem> {
  const formData = new FormData();
  formData.append("file", file, filename || (file instanceof File ? file.name : "upload.jpg"));

  const response = await http.post<MediaItem>("/admin/media/upload", formData, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function listMedia(page: number = 1, pageSize: number = 20): Promise<MediaListResponse> {
  const response = await http.get<MediaListResponse>("/admin/media", {
    params: { page, pageSize },
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteMedia(id: number): Promise<void> {
  await http.delete(`/admin/media/${id}`, {
    headers: getAuthHeaders(),
  });
}
