import type { ComponentType } from "react";
import type { ThemeTokens } from "../tokens";
import type { SectionProps } from "../types";

export interface ThemePackage {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  /** CSS gradient string for preview card */
  preview: string;
  tokens: ThemeTokens;
  /** Optional section component overrides per section type */
  sectionOverrides?: Record<string, ComponentType<SectionProps<any>>>;
}
