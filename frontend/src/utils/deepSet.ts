/**
 * Deep set: immutably update a nested value in an object by dot-notation path.
 * Returns a new object (does not mutate the original).
 * Supports array index notation: "a.b[0].c"
 */
export function deepSet<T>(obj: T, path: string, value: unknown): T {
  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  if (segments.length === 0) return value as T;

  function setRecursive(current: unknown, segs: string[], idx: number): unknown {
    const key = segs[idx];
    const isLast = idx === segs.length - 1;

    if (isLast) {
      if (Array.isArray(current)) {
        const arr = [...current];
        arr[Number(key)] = value;
        return arr;
      }
      return { ...(current as Record<string, unknown>), [key]: value };
    }

    const nextKey = segs[idx + 1];
    const isNextArray = /^\d+$/.test(nextKey);

    if (Array.isArray(current)) {
      const arr = [...current];
      const numKey = Number(key);
      arr[numKey] = setRecursive(arr[numKey] ?? (isNextArray ? [] : {}), segs, idx + 1);
      return arr;
    }

    const obj = current as Record<string, unknown>;
    return {
      ...obj,
      [key]: setRecursive(obj[key] ?? (isNextArray ? [] : {}), segs, idx + 1),
    };
  }

  return setRecursive(obj, segments, 0) as T;
}
