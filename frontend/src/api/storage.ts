import { http } from "./http";

export interface StorageConfig {
  strategy: string;
  bucket: string;
  region: string;
  endpoint: string;
  accessKey: string;
  hasSecretKey: boolean;
  basePath: string;
  updatedAt: string;
}

export interface UpdateStorageConfigRequest {
  strategy: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
  base_path?: string;
}

export interface StorageTestResult {
  success: boolean;
  message: string;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getStorageConfig() {
  const res = await http.get<StorageConfig>("/admin/storage/config", {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function updateStorageConfig(data: UpdateStorageConfigRequest) {
  const res = await http.put<StorageConfig>("/admin/storage/config", data, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function testStorageConnection() {
  const res = await http.post<StorageTestResult>("/admin/storage/test", {}, {
    headers: getAuthHeaders(),
  });
  return res.data;
}
