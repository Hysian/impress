import { useContext, useMemo } from "react";
import { ThemeManagerContext, type ThemeManagerContextValue } from "./ThemeManagerContextDef";
import { sectionRegistry, sectionMetas as baseSectionMetas } from "@/theme/sections";
import type { ComponentType } from "react";
import type { SectionProps, SectionMeta } from "@/theme/types";

/** Access the ThemeManager context */
export function useThemeManager(): ThemeManagerContextValue {
  return useContext(ThemeManagerContext);
}

/** Merge base section registry with active theme's section overrides */
export function useSectionRegistry(): {
  registry: Record<string, ComponentType<SectionProps<any>>>;
  metas: SectionMeta[];
} {
  const { activeTheme } = useThemeManager();

  return useMemo(() => {
    const merged = { ...sectionRegistry };
    if (activeTheme?.sections) {
      Object.assign(merged, activeTheme.sections);
    }

    const mergedMetas = [...baseSectionMetas];
    if (activeTheme?.sectionMetas) {
      // Add theme-specific metas that aren't already in base
      const existingTypes = new Set(mergedMetas.map((m) => m.type));
      for (const meta of activeTheme.sectionMetas) {
        if (!existingTypes.has(meta.type)) {
          mergedMetas.push(meta);
        }
      }
    }

    return { registry: merged, metas: mergedMetas };
  }, [activeTheme]);
}
