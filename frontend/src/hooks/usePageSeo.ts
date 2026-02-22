import { useMemo } from "react";
import { usePublicContent } from "@/hooks/usePublicContent";
import type { PageKey, Locale } from "@/api/publicContent";
import type { SeoHeadProps } from "@/components/SeoHead";

export interface UsePageSeoOptions {
  locale?: Locale;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export interface UsePageSeoResult {
  seoProps: SeoHeadProps;
  loading: boolean;
}

export function usePageSeo(
  pageKey: PageKey,
  options: UsePageSeoOptions = {}
): UsePageSeoResult {
  const { locale = "zh", fallbackTitle, fallbackDescription } = options;

  const { config, loading } = usePublicContent(pageKey, {
    locale,
    autoNormalize: true,
  });

  const seoProps = useMemo<SeoHeadProps>(() => {
    if (!config) {
      return {
        title: fallbackTitle,
        description: fallbackDescription,
      };
    }

    const seo = config.seo as Record<string, string> | undefined;
    const title = seo?.title || (config.title as string | undefined) || fallbackTitle;
    const description = seo?.description || (config.description as string | undefined) || fallbackDescription;

    return {
      title,
      description,
      ogTitle: seo?.ogTitle || title,
      ogDescription: seo?.ogDescription || description,
      ogImage: seo?.ogImage as string | undefined,
      ogType: seo?.ogType || "website",
      locale,
    };
  }, [config, locale, fallbackTitle, fallbackDescription]);

  return { seoProps, loading };
}
