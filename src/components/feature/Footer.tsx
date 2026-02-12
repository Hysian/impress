
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-[#1a5f8f] text-white">
      <div className="max-w-[1344px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Company Info - 左侧 */}
          <div>
            <img
              src="/images/logo.png"
              alt="Blotting Consultancy"
              className="h-10 w-auto mb-4"
            />
            <div className="space-y-2 text-sm text-gray-300">
              <p>{t('footer.address')}</p>
              <p>{t('footer.phone')}</p>
            </div>
          </div>

          {/* Company Links + Services Links - 整体靠右 */}
          <div className="flex flex-col sm:flex-row gap-8 md:ml-auto">
            {/* Company Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.companySection')}</h3>
              <ul className="space-y-2 text-sm">
              <li>
                <a href="#about" className="text-gray-300 hover:text-[#8bc34a] transition-colors cursor-pointer">
                  {t('footer.aboutUs')}
                </a>
              </li>
              <li>
                <a href="#team" className="text-gray-300 hover:text-[#8bc34a] transition-colors cursor-pointer">
                  {t('footer.ourTeam')}
                </a>
              </li>
              <li>
                <a href="#cases" className="text-gray-300 hover:text-[#8bc34a] transition-colors cursor-pointer">
                  {t('footer.caseStudies')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-300 hover:text-[#8bc34a] transition-colors cursor-pointer">
                  {t('footer.contactUs')}
                </a>
              </li>
            </ul>
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/20 text-center">
          <p className="text-sm text-gray-300">
            {t('footer.copyright')} | <a href="https://readdy.ai/?ref=logo" target="_blank" rel="noopener noreferrer" className="hover:text-[#8bc34a] transition-colors cursor-pointer">Website Builder</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
