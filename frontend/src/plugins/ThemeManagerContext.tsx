import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { themeManager } from "./ThemeManager";
import { ThemeManagerContext } from "./ThemeManagerContextDef";
import { corporateClassicTheme } from "./themes/corporate-classic";
import { http } from "@/api/http";
import "@/plugins/externals";

export type { ThemeManagerContextValue } from "./ThemeManagerContextDef";
export { ThemeManagerContext } from "./ThemeManagerContextDef";

// Register built-in themes immediately
themeManager.registerBuiltIn(corporateClassicTheme);

interface ThemeManagerProviderProps {
  children: ReactNode;
}

export function ThemeManagerProvider({ children }: ThemeManagerProviderProps) {
  const snapshot = useSyncExternalStore(
    (cb) => themeManager.subscribe(cb),
    () => themeManager.getSnapshot(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await http.get<{
          themeId: string;
          source?: string;
          externalUrl?: string;
        }>("/public/active-theme");

        if (cancelled) return;

        const { themeId, source, externalUrl } = res.data;

        // If external theme, load bundle first
        if (source === "external" && externalUrl) {
          try {
            await themeManager.loadExternal(externalUrl);
          } catch {
            // Fallback to corporate-classic if external load fails
          }
        }

        // Activate the theme; fallback to corporate-classic
        if (!themeManager.activate(themeId)) {
          themeManager.activate("corporate-classic");
        }
      } catch {
        // API unavailable — activate default built-in theme
        themeManager.activate("corporate-classic");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <ThemeManagerContext.Provider
      value={{
        manager: themeManager,
        ...snapshot,
        isLoading,
      }}
    >
      {children}
    </ThemeManagerContext.Provider>
  );
}
