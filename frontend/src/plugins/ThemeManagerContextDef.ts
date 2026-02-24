import { createContext } from "react";
import { themeManager, type ThemeManagerSnapshot } from "./ThemeManager";

export interface ThemeManagerContextValue extends ThemeManagerSnapshot {
  manager: typeof themeManager;
  isLoading: boolean;
}

export const ThemeManagerContext = createContext<ThemeManagerContextValue>({
  manager: themeManager,
  activeThemeId: null,
  activeTheme: null,
  themes: [],
  isLoading: true,
});
