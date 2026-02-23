import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGlobalConfig } from "@/contexts/GlobalConfigContext";
import type { HeaderConfig } from "./types";

interface ThemedHeaderProps {
  config?: HeaderConfig;
}

export default function ThemedHeader({ config }: ThemedHeaderProps) {
  const { i18n } = useTranslation("common");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { config: globalConfig } = useGlobalConfig();

  // Config prop overrides global config; CMS uses branding.logo.url + nav.items
  const navItems = globalConfig.nav?.items || [];
  const navigation = config?.navigation ?? navItems.map((item) => ({ label: item.label, path: item.href }));
  const logoSrc = config?.logo ?? globalConfig.branding?.logo?.url ?? "/images/logo.png";
  const logoAlt = globalConfig.branding?.companyName || "Blotting Consultancy";
  const showLanguageToggle = config?.showLanguageToggle ?? true;
  const style = config?.style ?? "sticky";

  useEffect(() => {
    if (style === "static") return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [style]);

  const toggleLanguage = () => {
    const newLang = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(newLang);
  };

  const isFixed = style === "sticky" || style === "transparent";
  const showScrollEffect = style !== "static";

  return (
    <header
      className={`${isFixed ? "fixed top-0 left-0 right-0 z-50" : "relative z-50"} transition-all duration-300 ${
        showScrollEffect && isScrolled ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      {/* Top Language Bar */}
      {showLanguageToggle && (
        <div className="bg-primary text-on-primary py-2">
          <div className="max-w-layout mx-auto px-4 md:px-6 flex justify-end items-center">
            <button
              onClick={toggleLanguage}
              className="text-sm hover:opacity-80 transition-opacity whitespace-nowrap cursor-pointer"
            >
              {i18n.language === "zh" ? "English" : "\u4E2D\u6587"}
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="py-8">
        <div className="max-w-layout mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/">
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            {navigation.length > 0 && (
              <div className="hidden lg:flex items-center space-x-8">
                {navigation.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path || "/"}
                    className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      showScrollEffect && isScrolled
                        ? "text-on-surface hover:text-accent"
                        : "text-on-primary hover:text-accent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 cursor-pointer ${
                showScrollEffect && isScrolled ? "text-on-surface" : "text-on-primary"
              }`}
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-full bg-current transition-all ${
                    isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full bg-current transition-all ${
                    isMobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-full bg-current transition-all ${
                    isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && navigation.length > 0 && (
            <div className="lg:hidden mt-4 pb-4 space-y-3">
              {navigation.map((item, index) => (
                <Link
                  key={index}
                  to={item.path || "/"}
                  className="block text-sm font-medium text-on-surface hover:text-accent transition-colors cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
