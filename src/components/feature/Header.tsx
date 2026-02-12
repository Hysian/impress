import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t, i18n } = useTranslation('common');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div className="bg-[#1a5f8f] text-white py-2">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6 flex justify-end items-center">
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
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/"> 
                <img
                  src="/images/logo.png"
                  alt="Blotting Consultancy"
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                to="/about"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.about')}
              </Link>
              <Link
                to="/advantages"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.services')}
              </Link>
              <Link
                to="/cases"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.projects')}
              </Link>
              <Link
                to="/core-services"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.coreServices')}
              </Link>
              <Link
                to="/experts"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.expertTeam')}
              </Link>
              <Link
                to="/contact"
                className={`text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isScrolled ? 'text-gray-700 hover:text-[#8bc34a]' : 'text-white hover:text-[#8bc34a]'
                }`}
              >
                {t('nav.contact')}
              </Link>
            </div>

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
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 space-y-3">
              <Link
                to="/about"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.about')}
              </Link>
              <Link
                to="/advantages"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.services')}
              </Link>
              <Link
                to="/cases"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.projects')}
              </Link>
              <Link
                to="/core-services"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.coreServices')}
              </Link>
              <Link
                to="/experts"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.expertTeam')}
              </Link>
              <Link
                to="/contact"
                className="block text-sm font-medium text-gray-700 hover:text-[#8bc34a] transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.contact')}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}