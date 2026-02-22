import { createContext } from "react";
import { defaultTokens, type ThemeTokens } from "./tokens";

export interface ThemeContextValue {
  tokens: ThemeTokens;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  tokens: defaultTokens,
  isLoading: false,
});
