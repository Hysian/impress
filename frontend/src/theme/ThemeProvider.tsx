import { useEffect, useState, type ReactNode } from "react";
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
  const baseTokens = activeTheme?.defaultTokens ?? defaultTokens;

  const [tokens, setTokens] = useState<ThemeTokens>(baseTokens);
  const [isLoading, setIsLoading] = useState(true);

  // Update base tokens when active theme changes
  useEffect(() => {
    applyTokens(baseTokens);
    setTokens(baseTokens);
  }, [baseTokens]);

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
  }, [baseTokens]);

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
