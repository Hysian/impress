import { http } from "@/api/http";

export interface WizardPlanRequest {
  industry: string;
  style_preference: string;
  features: string[];
  content_types: string[];
  brand_name: string;
  description: string;
  locale: string;
}

export interface WizardPlan {
  recommended_theme: string;
  pages: Array<{ name: string; slug: string; description: string }>;
  color_scheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  [key: string]: unknown;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  [key: string]: string;
}

export interface GeneratedContent {
  title?: string;
  body?: string;
  sections?: unknown[];
  [key: string]: unknown;
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function generateWizardPlan(req: WizardPlanRequest): Promise<WizardPlan> {
  const response = await http.post<WizardPlan>("/admin/wizard/generate-plan", req, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function applyWizardPlan(plan: WizardPlan): Promise<{ success: boolean; pages_created: number }> {
  const response = await http.post<{ success: boolean; pages_created: number }>("/admin/wizard/apply-plan", plan, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function suggestColors(industry: string, brand_name: string): Promise<ColorPalette> {
  const response = await http.post<ColorPalette>("/admin/wizard/suggest-colors", { industry, brand_name }, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function generateContent(page_type: string, industry: string, locale: string): Promise<GeneratedContent> {
  const response = await http.post<GeneratedContent>("/admin/wizard/generate-content", { page_type, industry, locale }, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
