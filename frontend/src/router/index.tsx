import { useNavigate, type RouteObject } from "react-router-dom";
import { useRoutes } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { staticRoutes } from "./config";
import { resolveNavigate } from "./navigate";
import { useThemeManager } from "@/plugins/hooks";
import ThemePageWrapper from "@/plugins/ThemePageWrapper";

declare global {
  interface Window {
    REACT_APP_NAVIGATE: ReturnType<typeof useNavigate>;
  }
}

export function AppRoutes() {
  const { activeTheme, isLoading } = useThemeManager();
  const navigate = useNavigate();

  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    resolveNavigate(navigate);
  });

  const routes = useMemo(() => {
    const themeRoutes: RouteObject[] = (activeTheme?.pages || []).map((pageDef) => ({
      path: pageDef.slug === "home" ? "/" : `/${pageDef.slug}`,
      element: <ThemePageWrapper pageDef={pageDef} />,
    }));
    return [...themeRoutes, ...staticRoutes];
  }, [activeTheme]);

  const element = useRoutes(routes);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  return element;
}
