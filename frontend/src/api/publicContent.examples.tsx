/**
 * Example usage of public content data access layer
 * This file demonstrates how to use the API client and hook
 */

/* eslint-disable react-refresh/only-export-components */

import { usePublicContent } from "@/hooks/usePublicContent";
import { fetchPublicContent, getLocalizedText, type LocalizedText } from "@/api/publicContent";

/**
 * Example 1: Using the hook in a component with automatic normalization
 */
export function ExampleHomePageWithHook() {
  const { loading, error, config } = usePublicContent("home", {
    locale: "zh",
    autoNormalize: true,
  });

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error.message}</div>;
  }

  if (!config) {
    return null;
  }

  // After normalization, LocalizedText fields are replaced with strings
  const hero = config.hero as { title: string; subtitle: string };

  return (
    <div>
      <h1>{hero.title}</h1>
      <p>{hero.subtitle}</p>
    </div>
  );
}

/**
 * Example 2: Using the hook without normalization (raw config)
 */
export function ExampleHomePageRaw() {
  const { loading, error, response } = usePublicContent("home", {
    locale: "en",
    autoNormalize: false,
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!response) {
    return null;
  }

  // Without normalization, LocalizedText objects remain intact
  const hero = response.config.hero as {
    title: LocalizedText;
    subtitle: LocalizedText;
  };

  return (
    <div>
      <h1>{getLocalizedText(hero.title, response.locale)}</h1>
      <p>{getLocalizedText(hero.subtitle, response.locale)}</p>
      <small>Version: {response.version}</small>
    </div>
  );
}

/**
 * Example 3: Using the API client directly (non-React context)
 */
export async function fetchHomeContentDirectly() {
  try {
    const response = await fetchPublicContent("home", "zh");
    console.log("Fetched content:", response);
    return response;
  } catch (error) {
    console.error("Failed to fetch:", error);
    throw error;
  }
}

/**
 * Example 4: Locale fallback demonstration
 */
export function ExampleLocaleFallback() {
  const { loading, error, config, response } = usePublicContent("about", {
    locale: "en",
    autoNormalize: true,
  });

  if (loading || error || !config || !response) {
    return <div>Loading or error...</div>;
  }

  // If English content is missing, the hook will fallback to Chinese
  // This happens automatically during normalization
  return (
    <div>
      <p>Requested locale: {response.locale}</p>
      <p>Content is automatically fallen back to zh if en is missing</p>
    </div>
  );
}

/**
 * Example 5: Refetch on demand
 */
export function ExampleRefetch() {
  const { loading, config, refetch } = usePublicContent("contact", {
    locale: "zh",
  });

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <div>{JSON.stringify(config)}</div>
      <button onClick={handleRefresh}>刷新内容</button>
    </div>
  );
}

/**
 * Example 6: Conditional fetching
 */
export function ExampleConditionalFetch({ shouldFetch }: { shouldFetch: boolean }) {
  const { loading, config } = usePublicContent("cases", {
    locale: "zh",
    enabled: shouldFetch,
  });

  if (!shouldFetch) {
    return <div>Fetching disabled</div>;
  }

  if (loading) {
    return <div>加载中...</div>;
  }

  return <div>{JSON.stringify(config)}</div>;
}
