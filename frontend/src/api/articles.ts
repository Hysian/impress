import { http } from "@/api/http";

// ---------- Types ----------

export interface Article {
  id: number;
  slug: string;
  status: "draft" | "published";
  zhTitle: string;
  enTitle: string;
  zhBody: string;
  enBody: string;
  coverImage: string;
  zhSeoTitle: string;
  enSeoTitle: string;
  zhMetaDescription: string;
  enMetaDescription: string;
  ogImage: string;
  categoryId: number | null;
  category?: Category;
  tags?: Tag[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  slug: string;
  zhName: string;
  enName: string;
}

export interface Tag {
  id: number;
  slug: string;
  zhName: string;
  enName: string;
}

interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
}

interface PublicArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- Auth ----------

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// ---------- Public APIs ----------

export async function getPublicArticles(
  page: number = 1,
  pageSize: number = 10,
  category?: string,
  tag?: string
): Promise<PublicArticleListResponse> {
  const params: Record<string, string | number> = { page, pageSize };
  if (category) params.category = category;
  if (tag) params.tag = tag;

  const response = await http.get<PublicArticleListResponse>("/public/articles", {
    params,
  });
  return response.data;
}

export async function getPublicArticle(slug: string): Promise<Article> {
  const response = await http.get<Article>(`/public/articles/${slug}`);
  return response.data;
}

// ---------- Admin Article APIs ----------

export async function getAdminArticles(
  page: number = 1,
  pageSize: number = 10,
  status?: string
): Promise<ArticleListResponse> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status) params.status = status;

  const response = await http.get<ArticleListResponse>("/admin/articles", {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getAdminArticle(id: number): Promise<Article> {
  const response = await http.get<Article>(`/admin/articles/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function createArticle(data: Partial<Article>): Promise<Article> {
  const response = await http.post<Article>("/admin/articles", data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateArticle(id: number, data: Partial<Article>): Promise<Article> {
  const response = await http.put<Article>(`/admin/articles/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteArticle(id: number): Promise<void> {
  await http.delete(`/admin/articles/${id}`, {
    headers: getAuthHeaders(),
  });
}

// ---------- Category APIs ----------

export async function getCategories(): Promise<Category[]> {
  const response = await http.get<Category[]>("/admin/articles/categories", {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const response = await http.post<Category>("/admin/articles/categories", data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  const response = await http.put<Category>(`/admin/articles/categories/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await http.delete(`/admin/articles/categories/${id}`, {
    headers: getAuthHeaders(),
  });
}

// ---------- Tag APIs ----------

export async function getTags(): Promise<Tag[]> {
  const response = await http.get<Tag[]>("/admin/articles/tags", {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function createTag(data: Partial<Tag>): Promise<Tag> {
  const response = await http.post<Tag>("/admin/articles/tags", data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteTag(id: number): Promise<void> {
  await http.delete(`/admin/articles/tags/${id}`, {
    headers: getAuthHeaders(),
  });
}
