/**
 * Deep get: retrieve a nested value from an object by dot-notation path.
 * Supports array index notation: "a.b[0].c"
 */
export function deepGet(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}
