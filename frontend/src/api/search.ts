import { http } from "@/api/http";

export interface SearchResult {
  id: number;
  type: string;
  title: string;
  snippet: string;
  url: string;
  locale: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}

export async function searchContent(
  q: string,
  locale = "zh",
  contentType = "",
  page = 1,
  pageSize = 10
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, locale, page: String(page), pageSize: String(pageSize) });
  if (contentType) params.set("type", contentType);
  const { data } = await http.get<SearchResponse>(`/public/search?${params}`);
  return data;
}

export async function searchSuggest(q: string, locale = "zh", limit = 5): Promise<string[]> {
  const { data } = await http.get<string[]>(
    `/public/search/suggest?q=${encodeURIComponent(q)}&locale=${locale}&limit=${limit}`
  );
  return data;
}
