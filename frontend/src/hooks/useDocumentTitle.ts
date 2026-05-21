import { useEffect } from "react";
import { useSEODefaults } from "./useSEODefaults";

/**
 * Sets document.title to `buildTitle(title)` for the lifetime of the component.
 * Restores the previous title on unmount.
 */
export function useDocumentTitle(title: string | undefined | null) {
  const { buildTitle } = useSEODefaults();
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = buildTitle(title);
    return () => {
      document.title = prev;
    };
  }, [title, buildTitle]);
}
