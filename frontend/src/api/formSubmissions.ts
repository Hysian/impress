import { http } from "./http";

export interface FormSubmission {
  id: number;
  formType: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  sourceUrl?: string;
  locale?: string;
  ipAddress?: string;
  status: "unread" | "read" | "archived";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitFormData {
  formType: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  sourceUrl?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}

export interface FormSubmissionListResponse {
  items: FormSubmission[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubmissionCounts {
  counts: Record<string, number>;
}

// Public - no auth needed
export async function submitForm(data: SubmitFormData) {
  const res = await http.post<FormSubmission>("/public/form-submissions", data);
  return res.data;
}

// Admin endpoints
const token = () => localStorage.getItem("accessToken") || "";
const authHeaders = () => ({
  headers: { Authorization: `Bearer ${token()}` },
});

export async function getFormSubmissions(
  page = 1,
  pageSize = 20,
  formType?: string,
  status?: string
) {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (formType) params.formType = formType;
  if (status) params.status = status;
  const res = await http.get<FormSubmissionListResponse>(
    "/admin/form-submissions",
    { params, ...authHeaders() }
  );
  return res.data;
}

export async function getFormSubmission(id: number) {
  const res = await http.get<FormSubmission>(
    `/admin/form-submissions/${id}`,
    authHeaders()
  );
  return res.data;
}

export async function updateSubmissionStatus(
  id: number,
  status: "unread" | "read" | "archived"
) {
  const res = await http.patch<FormSubmission>(
    `/admin/form-submissions/${id}/status`,
    { status },
    authHeaders()
  );
  return res.data;
}

export async function bulkUpdateStatus(
  ids: number[],
  status: "unread" | "read" | "archived"
) {
  const res = await http.post<{ message: string; count: number }>(
    "/admin/form-submissions/bulk-status",
    { ids, status },
    authHeaders()
  );
  return res.data;
}

export async function deleteFormSubmission(id: number) {
  await http.delete(`/admin/form-submissions/${id}`, authHeaders());
}

export async function getSubmissionCounts(formType?: string) {
  const params: Record<string, string> = {};
  if (formType) params.formType = formType;
  const res = await http.get<SubmissionCounts>(
    "/admin/form-submissions/counts",
    { params, ...authHeaders() }
  );
  return res.data;
}
