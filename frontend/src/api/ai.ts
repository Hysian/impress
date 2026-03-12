import { http } from "./http";

export interface AIConfig {
  provider: "openai" | "anthropic" | "noop";
  enabled: boolean;
  api_key?: string;
  base_url?: string;
  model?: string;
}

export interface UpdateAIConfigRequest {
  provider: "openai" | "anthropic" | "noop";
  api_key?: string;
  base_url?: string;
  model?: string;
}

export interface SummarizeRequest {
  text: string;
  max_length?: number;
}

export interface SummarizeResponse {
  summary: string;
}

export interface SuggestTitlesRequest {
  content: string;
  count?: number;
}

export interface SuggestTitlesResponse {
  titles: string[];
}

export interface SuggestTagsRequest {
  content: string;
  existing_tags?: string[];
}

export interface SuggestTagsResponse {
  tags: string[];
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getAIConfig() {
  const res = await http.get<AIConfig>("/admin/ai/config", {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function updateAIConfig(data: UpdateAIConfigRequest) {
  const res = await http.put<AIConfig>("/admin/ai/config", data, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function summarizeText(data: SummarizeRequest) {
  const res = await http.post<SummarizeResponse>("/admin/ai/summarize", data, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function suggestTitles(data: SuggestTitlesRequest) {
  const res = await http.post<SuggestTitlesResponse>("/admin/ai/suggest-titles", data, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function suggestTags(data: SuggestTagsRequest) {
  const res = await http.post<SuggestTagsResponse>("/admin/ai/suggest-tags", data, {
    headers: getAuthHeaders(),
  });
  return res.data;
}
