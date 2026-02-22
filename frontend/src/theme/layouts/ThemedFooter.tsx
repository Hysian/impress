import { useTranslation } from "react-i18next";
import { usePublicContent } from "@/hooks/usePublicContent";
import type { Locale } from "@/api/publicContent";
import type { FooterConfig } from "./types";

interface GlobalConfig {
  footer?: {
    logo?: string;
    address?: string;
    phone?: string;
    sections?: Array<{
      title?: string;
      links?: Array<{ label?: string; href?: string }>;
    }>;
    copyright?: string;
  };
}

interface ThemedFooterProps {
  config?: FooterConfig;
}

export default function ThemedFooter({ config }: ThemedFooterProps) {
  const { i18n } = useTranslation("common");
  const locale = (
    i18n.language === "zh" || i18n.language.startsWith("zh") ? "zh" : "en"
  ) as Locale;

  const { config: globalRaw } = usePublicContent("global", {
    locale,
    autoNormalize: true,
  });

  const globalConfig = (globalRaw as GlobalConfig) || {};
  const globalFooter = globalConfig.footer || {};

  // Config prop overrides global config
  const style = config?.style ?? "full";
  const logoSrc = config?.logo ?? globalFooter.logo ?? "/images/logo.png";
  const address = config?.address ?? globalFooter.address;
  const phone = config?.phone ?? globalFooter.phone;
  const sections = config?.sections ?? globalFooter.sections ?? [];
  const copyright = config?.copyright ?? globalFooter.copyright ?? "\u00A9 2024 Blotting Consultancy";

  if (style === "none") {
    return null;
  }

  if (style === "minimal") {
    return (
      <footer className="bg-primary text-on-primary">
        <div className="max-w-layout mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img
              src={logoSrc}
              alt="Blotting Consultancy"
              className="h-8 w-auto"
            />
            <p className="text-sm text-gray-300">{copyright}</p>
          </div>
        </div>
      </footer>
    );
  }

  // "full" style (default)
  return (
    <footer className="bg-primary text-on-primary">
      <div className="max-w-layout mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Company Info */}
          <div>
            <img
              src={logoSrc}
              alt="Blotting Consultancy"
              className="h-10 w-auto mb-4"
            />
            <div className="space-y-2 text-sm text-gray-300">
              {address && <p>{address}</p>}
              {phone && <p>{phone}</p>}
            </div>
          </div>

          {/* Link Sections */}
          {sections.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-8 md:ml-auto">
              {sections.map((section, index) => (
                <div key={index}>
                  {section.title && (
                    <h3 className="text-lg font-semibold mb-4">
                      {section.title}
                    </h3>
                  )}
                  {section.links && section.links.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {section.links.map((link, linkIndex) => (
                        <li key={linkIndex}>
                          <a
                            href={link.href || "#"}
                            className="text-gray-300 hover:text-accent transition-colors cursor-pointer"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/20 text-center">
          <p className="text-sm text-gray-300">
            {copyright} |{" "}
            <a
              href="https://readdy.ai/?ref=logo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Website Builder
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
