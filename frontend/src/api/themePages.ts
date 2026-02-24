import { http } from "./http";

export interface ThemePageItem {
  id: number;
  slug: string;
  title: { zh?: string; en?: string };
  contentKey: string;
  renderMode: "hardcoded" | "dynamic";
  isThemePage: boolean;
  themeId: string;
  navConfig: { showInHeader?: boolean; showInFooter?: boolean };
  sortOrder: number;
  status: string;
}

export async function getThemePages(): Promise<ThemePageItem[]> {
  const res = await http.get<{ items: ThemePageItem[] }>("/public/theme-pages");
  return res.data.items || [];
}
