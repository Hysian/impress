
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

interface LinkItem {
  label?: string;
  href?: string;
}

export default function Footer() {
  const { config: globalConfig } = useGlobalConfig();
  const footer = globalConfig.footer || {};
  const logoSrc = globalConfig.branding?.logo?.url || '/images/logo.png';
  const logoAlt = globalConfig.branding?.companyName || 'Blotting Consultancy';
  const links: LinkItem[] = footer.links || [];

  return (
    <footer className="bg-primary text-white">
      <div className="max-w-layout mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Company Info - 左侧 */}
          <div>
            <img
              src={logoSrc}
              alt={logoAlt}
              className="h-10 w-auto mb-4"
            />
            <div className="space-y-2 text-sm text-gray-300">
              {footer.address && <p>{footer.address}</p>}
              {footer.phone && <p>{footer.phone}</p>}
            </div>
          </div>

          {/* Links - 整体靠右 */}
          {links.length > 0 && (
            <div className="md:ml-auto">
              <ul className="flex flex-wrap gap-4 text-sm">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href || '#'}
                      className="text-gray-300 hover:text-accent transition-colors cursor-pointer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/20 text-center">
          <p className="text-sm text-gray-300">
            {footer.copyright || '© 2024 Blotting Consultancy'} | <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors cursor-pointer">Website Builder</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
