/**
 * Public Content API Client
 * Handles fetching published page configurations from the backend
 */

export type Locale = "zh" | "en";

export type PageKey =
  | "home"
  | "about"
  | "advantages"
  | "core-services"
  | "cases"
  | "experts"
  | "contact"
  | "global";

export interface PublicPageResponse {
  pageKey: PageKey;
  version: number;
  locale: Locale;
  config: Record<string, unknown>;
}

export interface PublicContentError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Fetch published content for a specific page and locale
 * @param pageKey - The page identifier
 * @param locale - The locale to fetch (zh or en)
 * @returns Published page configuration
 * @throws Error with PublicContentError structure on API failure
 */
export async function fetchPublicContent(
  pageKey: PageKey,
  locale: Locale = "zh"
): Promise<PublicPageResponse> {
  const url = `/public/content/${pageKey}?locale=${locale}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorData: PublicContentError;
    try {
      const json = await response.json();
      errorData = json.error || {
        code: "UNKNOWN_ERROR",
        message: `Failed to fetch content: ${response.statusText}`,
      };
    } catch {
      errorData = {
        code: "NETWORK_ERROR",
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    throw errorData;
  }

  const data: PublicPageResponse = await response.json();
  return data;
}

/**
 * LocalizedText represents a bilingual text field
 */
export interface LocalizedText {
  zh: string;
  en: string;
}

/**
 * Apply locale fallback to localized text
 * Returns the requested locale value, or falls back to zh if missing
 * Does NOT mutate the source object
 *
 * @param text - LocalizedText object or undefined
 * @param locale - Requested locale
 * @returns The text value in the requested locale, or zh fallback, or empty string
 */
export function getLocalizedText(
  text: LocalizedText | undefined,
  locale: Locale
): string {
  if (!text) return "";

  const value = text[locale];
  if (value && value.trim().length > 0) {
    return value;
  }

  // Fallback to zh if requested locale is missing
  if (locale === "en" && text.zh && text.zh.trim().length > 0) {
    return text.zh;
  }

  return "";
}

/**
 * Recursively apply locale selection to a config object
 * For any LocalizedText-like object ({ zh, en }), returns the locale-selected value
 * Does NOT mutate the source config
 *
 * @param config - Page config object
 * @param locale - Target locale
 * @returns Config with locale-selected values
 */
export function normalizeConfigForLocale(
  config: Record<string, unknown>,
  locale: Locale
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in config) {
    const value = config[key];

    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }

    // Check if it's a LocalizedText object (has both zh and en keys)
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      "zh" in value &&
      "en" in value
    ) {
      result[key] = getLocalizedText(value as LocalizedText, locale);
      continue;
    }

    // Recursively process nested objects
    if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = normalizeConfigForLocale(
        value as Record<string, unknown>,
        locale
      );
      continue;
    }

    // Process arrays
    if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          return normalizeConfigForLocale(item as Record<string, unknown>, locale);
        }
        return item;
      });
      continue;
    }

    // Primitive values pass through
    result[key] = value;
  }

  return result;
}
