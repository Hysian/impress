import type { ThemeTokens } from "../tokens";

export interface ThemePackage {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  /** CSS gradient string for preview card */
  preview: string;
  tokens: ThemeTokens;
}
