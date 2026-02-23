import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchPublicContent,
  normalizeConfigForLocale,
  type Locale,
} from "@/api/publicContent";

interface MediaRef {
  url?: string;
  alt?: string;
}

interface NavItem {
  label?: string;
  href?: string;
}

interface LinkItem {
  label?: string;
  href?: string;
}

export interface GlobalConfig {
  branding?: {
    logo?: MediaRef;
    companyName?: string;
  };
  nav?: {
    items?: NavItem[];
  };
  footer?: {
    address?: string;
    phone?: string;
    links?: LinkItem[];
    copyright?: string;
  };
}

interface GlobalConfigContextValue {
  config: GlobalConfig;
  loading: boolean;
  locale: Locale;
  refetch: () => Promise<void>;
}

const GlobalConfigContext = createContext<GlobalConfigContextValue>({
  config: {},
  loading: true,
  locale: "zh",
  refetch: async () => {},
});

export function GlobalConfigProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation("common");
  const locale = (
    i18n.language === "zh" || i18n.language.startsWith("zh") ? "zh" : "en"
  ) as Locale;

  const [config, setConfig] = useState<GlobalConfig>({});
  const [loading, setLoading] = useState(true);

  const doFetch = useCallback(async () => {
    try {
      const data = await fetchPublicContent("global", locale);
      const normalized = normalizeConfigForLocale(data.config, locale);
      setConfig(normalized as GlobalConfig);
    } catch {
      // Keep previous config on error
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    setLoading(true);
    doFetch();
  }, [doFetch]);

  return (
    <GlobalConfigContext.Provider value={{ config, loading, locale, refetch: doFetch }}>
      {children}
    </GlobalConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGlobalConfig(): GlobalConfigContextValue {
  return useContext(GlobalConfigContext);
}
