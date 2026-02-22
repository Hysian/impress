import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
