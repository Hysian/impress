import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchPublicContent,
  fetchDraftContent,
  normalizeConfigForLocale,
  type PageKey,
  type Locale,
  type PublicPageResponse,
  type PublicContentError,
} from "@/api/publicContent";

export interface UsePublicContentOptions {
  /**
   * Target locale for content
   * @default "zh"
   */
  locale?: Locale;

  /**
   * Whether to automatically normalize config for locale
   * When true, LocalizedText objects are replaced with locale-selected strings
   * @default true
   */
  autoNormalize?: boolean;

  /**
   * Whether to fetch on mount
   * @default true
   */
  enabled?: boolean;
}

export interface UsePublicContentResult {
  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state (contains error object if fetch failed)
   */
  error: PublicContentError | null;

  /**
   * Page configuration data
   * If autoNormalize is true, LocalizedText fields are replaced with locale-selected strings
   */
  config: Record<string, unknown> | null;

  /**
   * Full API response (includes version, pageKey, locale, and raw config)
   */
  response: PublicPageResponse | null;

  /**
   * Refetch the content
   */
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching public page content with locale support
 *
 * @param pageKey - The page identifier to fetch
 * @param options - Configuration options
 * @returns Result object with loading, error, config, and refetch
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   const { loading, error, config } = usePublicContent("home", {
 *     locale: "zh",
 *     autoNormalize: true
 *   });
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!config) return null;
 *
 *   return <div>{config.hero.title}</div>;
 * }
 * ```
 */
export function usePublicContent(
  pageKey: PageKey,
  options: UsePublicContentOptions = {}
): UsePublicContentResult {
  const {
    locale = "zh",
    autoNormalize = true,
    enabled = true,
  } = options;

  const [searchParams] = useSearchParams();
  const isPreviewDraft = searchParams.get("preview") === "draft";

  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<PublicContentError | null>(null);
  const [response, setResponse] = useState<PublicPageResponse | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = isPreviewDraft
        ? await fetchDraftContent(pageKey, locale)
        : await fetchPublicContent(pageKey, locale);
      setResponse(data);
    } catch (err) {
      const errorData = err as PublicContentError;
      setError(errorData);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [pageKey, locale, isPreviewDraft]);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [enabled, fetch]);

  // Compute normalized config
  const config = response
    ? autoNormalize
      ? normalizeConfigForLocale(response.config, locale)
      : response.config
    : null;

  return {
    loading,
    error,
    config,
    response,
    refetch: fetch,
  };
}
