import { http } from "./http";
import type { ThemeTokens } from "@/theme";

const token = () => localStorage.getItem("accessToken") || "";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${token()}` },
});

export async function getThemeSettings() {
  const res = await http.get<{ theme: ThemeTokens; version: number }>(
    "/admin/theme",
    authHeaders()
  );
  return res.data;
}

export async function updateThemeSettings(theme: ThemeTokens) {
  const res = await http.put<{ theme: ThemeTokens; version: number }>(
    "/admin/theme",
    { theme },
    authHeaders()
  );
  return res.data;
}
