import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicContent } from '@/hooks/usePublicContent';
import type { Locale } from '@/api/publicContent';

interface NavItem {
  label?: string;
  path?: string;
}

interface HeaderConfig {
  logo?: string;
  navigation?: NavItem[];
}

interface GlobalConfig {
  header?: HeaderConfig;
}

export default function Header() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { config } = usePublicContent('global', {
    locale,
    autoNormalize: true,
  });

  const globalConfig = (config as GlobalConfig) || {};
  const header = globalConfig.header || {};
  const navigation = header.navigation || [];
  const logoSrc = header.logo || '/images/logo.png';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      {/* Top Language Bar */}
      <div className="bg-primary text-white py-2">
        <div className="max-w-layout mx-auto px-4 md:px-6 flex justify-end items-center">
          <button
            onClick={toggleLanguage}
            className="text-sm hover:opacity-80 transition-opacity whitespace-nowrap cursor-pointer"
          >
            {i18n.language === 'zh' ? 'English' : '中文'}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="py-8">
        <div className="max-w-layout mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/">
                <img
                  src={logoSrc}
                  alt="Blotting Consultancy"
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
                    to={item.path || '/'}
                    className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isScrolled ? 'text-gray-700 hover:text-accent' : 'text-white hover:text-accent'
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
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span className={`block h-0.5 w-full bg-current transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-current transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-full bg-current transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && navigation.length > 0 && (
            <div className="lg:hidden mt-4 pb-4 space-y-3">
              {navigation.map((item, index) => (
                <Link
                  key={index}
                  to={item.path || '/'}
                  className="block text-sm font-medium text-gray-700 hover:text-accent transition-colors cursor-pointer"
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