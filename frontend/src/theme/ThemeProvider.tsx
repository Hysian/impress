import { useEffect, useRef, useState, type ReactNode } from "react";
import { http } from "@/api/http";
import { defaultTokens, type ThemeTokens } from "./tokens";
import { ThemeContext } from "./ThemeContext";
import { useThemeManager } from "@/plugins/hooks";

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", tokens.colors.primary);
  root.style.setProperty("--color-primary-dark", tokens.colors.primaryDark);
  root.style.setProperty("--color-accent", tokens.colors.accent);
  root.style.setProperty("--color-accent-hover", tokens.colors.accentHover);
  root.style.setProperty("--color-surface", tokens.colors.surface);
  root.style.setProperty("--color-surface-alt", tokens.colors.surfaceAlt);
  root.style.setProperty("--color-on-primary", tokens.colors.onPrimary);
  root.style.setProperty("--color-on-surface", tokens.colors.onSurface);
  root.style.setProperty("--color-on-surface-muted", tokens.colors.onSurfaceMuted);
  root.style.setProperty("--color-border", tokens.colors.border);
  root.style.setProperty("--font-sans", tokens.fonts.sans);
  root.style.setProperty("--font-heading", tokens.fonts.heading);
  root.style.setProperty("--layout-max-width", tokens.layout.maxWidth);
  root.style.setProperty("--radius-card", tokens.layout.borderRadius);
  root.style.setProperty("--radius-button", "0.375rem");
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { activeTheme } = useThemeManager();
  // Use activeThemeId as a stable dependency instead of the object reference
  const activeThemeId = activeTheme?.manifest?.id ?? null;
  const baseTokens = activeTheme?.defaultTokens ?? defaultTokens;

  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [isLoading, setIsLoading] = useState(true);
  const prevThemeIdRef = useRef<string | null>(null);

  // Update base tokens when active theme actually changes (by id, not reference)
  useEffect(() => {
    if (prevThemeIdRef.current !== activeThemeId) {
      prevThemeIdRef.current = activeThemeId;
      applyTokens(baseTokens);
      setTokens(baseTokens);
    }
  }, [activeThemeId, baseTokens]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTheme() {
      try {
        const response = await http.get<{ theme: ThemeTokens }>("/public/theme");
        if (!cancelled && response.data?.theme) {
          setTokens(response.data.theme);
          applyTokens(response.data.theme);
        }
      } catch {
        // API unavailable — keep base tokens (already applied)
        applyTokens(baseTokens);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchTheme();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThemeId]);

  // Re-apply whenever tokens change from outside (future live-update support)
  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  return (
    <ThemeContext.Provider value={{ tokens, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}
