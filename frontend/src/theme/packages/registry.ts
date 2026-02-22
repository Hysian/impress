import type { ThemePackage } from "./types";

const registry = new Map<string, ThemePackage>();

export function registerTheme(theme: ThemePackage): void {
  registry.set(theme.id, theme);
}

export function getTheme(id: string): ThemePackage | undefined {
  return registry.get(id);
}

export function listThemes(): ThemePackage[] {
  return Array.from(registry.values());
}
