
import { useTranslation } from 'react-i18next';
import { usePublicContent } from '@/hooks/usePublicContent';
import type { Locale } from '@/api/publicContent';

interface LinkItem {
  label?: string;
  href?: string;
}

interface LinkSection {
  title?: string;
  links?: LinkItem[];
}

interface FooterConfig {
  logo?: string;
  address?: string;
  phone?: string;
  sections?: LinkSection[];
  copyright?: string;
}

interface GlobalConfig {
  footer?: FooterConfig;
}

export default function Footer() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;

  const { config } = usePublicContent('global', {
    locale,
    autoNormalize: true,
  });

  const globalConfig = (config as GlobalConfig) || {};
  const footer = globalConfig.footer || {};
  const logoSrc = footer.logo || '/images/logo.png';
  const sections = footer.sections || [];

  return (
    <footer className="bg-[#1a5f8f] text-white">
      <div className="max-w-[1344px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Company Info - 左侧 */}
          <div>
            <img
              src={logoSrc}
              alt="Blotting Consultancy"
              className="h-10 w-auto mb-4"
            />
            <div className="space-y-2 text-sm text-gray-300">
              {footer.address && <p>{footer.address}</p>}
              {footer.phone && <p>{footer.phone}</p>}
            </div>
          </div>

          {/* Link Sections - 整体靠右 */}
          {sections.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-8 md:ml-auto">
              {sections.map((section, index) => (
                <div key={index}>
                  {section.title && (
                    <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                  )}
                  {section.links && section.links.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {section.links.map((link, linkIndex) => (
                        <li key={linkIndex}>
                          <a
                            href={link.href || '#'}
                            className="text-gray-300 hover:text-[#8bc34a] transition-colors cursor-pointer"
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
            {footer.copyright || '© 2024 Blotting Consultancy'} | <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="hover:text-[#8bc34a] transition-colors cursor-pointer">Website Builder</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
