import { registerTheme, listThemes, getTheme } from "./registry";
import defaultTheme from "./default";
import modernDarkTheme from "./modern-dark";
import warmEarthTheme from "./warm-earth";

// Register built-in themes
registerTheme(defaultTheme);
registerTheme(modernDarkTheme);
registerTheme(warmEarthTheme);

export { listThemes, getTheme, registerTheme };
export type { ThemePackage } from "./types";
