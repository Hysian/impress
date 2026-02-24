import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ThemePageItem } from "@/api/themePages";
import { useBootstrap } from "@/contexts/BootstrapContext";

interface NavItem {
  label: string;
  path: string;
  sortOrder: number;
}

interface ThemePagesContextValue {
  pages: ThemePageItem[];
  headerNavItems: NavItem[];
  footerNavItems: NavItem[];
  isLoading: boolean;
}

const ThemePagesContext = createContext<ThemePagesContextValue>({
  pages: [],
  headerNavItems: [],
  footerNavItems: [],
  isLoading: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useThemePages() {
  return useContext(ThemePagesContext);
}

export function ThemePagesProvider({ children }: { children: ReactNode }) {
  const { data: bootstrapData, isLoading: bootstrapLoading } = useBootstrap();
  const { i18n } = useTranslation("common");

  const pages = useMemo(() => bootstrapData?.themePages ?? [], [bootstrapData]);
  const isLoading = bootstrapLoading;
  const locale = i18n.language === "en" ? "en" : "zh";

  const headerNavItems = useMemo(() => {
    return pages
      .filter((p) => p.status === "published" && p.navConfig?.showInHeader)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        label: (locale === "en" ? p.title.en : p.title.zh) || p.title.zh || p.slug,
        path: p.slug === "home" ? "/" : `/${p.slug}`,
        sortOrder: p.sortOrder,
      }));
  }, [pages, locale]);

  const footerNavItems = useMemo(() => {
    return pages
      .filter((p) => p.status === "published" && p.navConfig?.showInFooter)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        label: (locale === "en" ? p.title.en : p.title.zh) || p.title.zh || p.slug,
        path: p.slug === "home" ? "/" : `/${p.slug}`,
        sortOrder: p.sortOrder,
      }));
  }, [pages, locale]);

  const value = useMemo(() => ({
    pages,
    headerNavItems,
    footerNavItems,
    isLoading,
  }), [pages, headerNavItems, footerNavItems, isLoading]);

  return (
    <ThemePagesContext.Provider value={value}>
      {children}
    </ThemePagesContext.Provider>
  );
}
