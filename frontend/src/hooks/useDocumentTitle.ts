import { useEffect } from "react";

/**
 * Sets document.title while the component is mounted.
 * Restores the previous title on unmount.
 */
export function useDocumentTitle(title: string | undefined | null, suffix?: string) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = suffix ? `${title} | ${suffix}` : title;
    return () => {
      document.title = prev;
    };
  }, [title, suffix]);
}
