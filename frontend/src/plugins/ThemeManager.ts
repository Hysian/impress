import type { ThemePlugin } from "./types";

type Listener = () => void;

export class ThemeManager {
  private registry = new Map<string, ThemePlugin>();
  private activeThemeId: string | null = null;
  private listeners = new Set<Listener>();

  /** Register a built-in theme */
  registerBuiltIn(theme: ThemePlugin): void {
    this.registry.set(theme.manifest.id, theme);
    theme.onRegister?.();
    this.emit();
  }

  /** Register an externally loaded theme */
  registerExternal(theme: ThemePlugin): void {
    this.registry.set(theme.manifest.id, theme);
    theme.onRegister?.();
    this.emit();
  }

  /** Activate a theme by id */
  activate(themeId: string): boolean {
    const theme = this.registry.get(themeId);
    if (!theme) return false;

    // Deactivate previous
    if (this.activeThemeId && this.activeThemeId !== themeId) {
      const prev = this.registry.get(this.activeThemeId);
      prev?.onDeactivate?.();
    }

    this.activeThemeId = themeId;
    theme.onActivate?.();
    this.emit();
    return true;
  }

  /** Get the currently active theme */
  getActiveTheme(): ThemePlugin | null {
    if (!this.activeThemeId) return null;
    return this.registry.get(this.activeThemeId) ?? null;
  }

  /** Get active theme id */
  getActiveThemeId(): string | null {
    return this.activeThemeId;
  }

  /** List all registered themes */
  listThemes(): ThemePlugin[] {
    return Array.from(this.registry.values());
  }

  /** Get a theme by id */
  getTheme(id: string): ThemePlugin | undefined {
    return this.registry.get(id);
  }

  /** Load an external theme from a UMD bundle URL */
  loadExternal(url: string): Promise<ThemePlugin> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`External theme load timeout (30s): ${url}`));
      }, 30_000);

      const cleanup = () => {
        clearTimeout(timeout);
        delete (window as any).__IMPRESS_THEME_REGISTER__;
      };

      (window as any).__IMPRESS_THEME_REGISTER__ = (theme: ThemePlugin) => {
        cleanup();
        this.registerExternal(theme);
        resolve(theme);
      };

      const script = document.createElement("script");
      script.src = url;
      script.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load external theme from: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  // --- useSyncExternalStore compatibility ---

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = (): ThemeManagerSnapshot => {
    return {
      activeThemeId: this.activeThemeId,
      activeTheme: this.getActiveTheme(),
      themes: this.listThemes(),
    };
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export interface ThemeManagerSnapshot {
  activeThemeId: string | null;
  activeTheme: ThemePlugin | null;
  themes: ThemePlugin[];
}

/** Singleton instance */
export const themeManager = new ThemeManager();
