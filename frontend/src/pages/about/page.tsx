import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';
import { usePublicContent } from '@/hooks/usePublicContent';
import type { Locale } from '@/api/publicContent';

interface HeroConfig {
  label?: string;
  title?: string;
}

interface CompanyProfileConfig {
  title?: string;
  description?: string;
}

interface SectionConfig {
  description?: string;
  image?: string;
}

interface AboutPageConfig {
  hero?: HeroConfig;
  companyProfile?: CompanyProfileConfig;
  section2?: SectionConfig;
  section3?: SectionConfig;
}

export default function AboutPage() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;

  const { loading, error, config } = usePublicContent('about', {
    locale,
    autoNormalize: true,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Failed to load page content</div>
      </div>
    );
  }

  const pageConfig = (config as AboutPageConfig) || {};
  const hero = pageConfig.hero || {};
  const companyProfile = pageConfig.companyProfile || {};
  const section2 = pageConfig.section2 || {};
  const section3 = pageConfig.section3 || {};

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={hero.label || ''}
        title={hero.title || ''}
        alt="About Us Hero"
      />

      {/* Section 1: 公司简介 - 标题左、描述右 */}
      {companyProfile.title && (
        <section className="py-12 md:py-16 lg:py-24 bg-white">
          <div className="max-w-[1344px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
              <div className="lg:col-span-3 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-[#1a5f8f] uppercase">
                  {companyProfile.title}
                </h2>
              </div>
              {companyProfile.description && (
                <div className="lg:col-span-9">
                  <p className="text-2xl  md:text-3xl leading-relaxed text-[#26548b]">
                    {companyProfile.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 公司简介下方：两段图文区块，样式与我们的优势一致 */}
      <div className="py-12 md:py-16 lg:py-24 bg-white">
        {/* Section 2: 图左文右 */}
        {section2.description && (
          <section className="bg-white">
            <div className="max-w-[1344px] mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="w-full aspect-[4/3] max-h-[400px] lg:max-h-none overflow-hidden rounded-lg order-2 lg:order-1">
                  <img
                    src={section2.image || '/images/about-us/about-us-1.png'}
                    alt="About Us"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="w-full py-12 px-10 md:px-16 order-1 lg:order-2">
                  <p className="text-xl md:text-2xl leading-relaxed text-[#26548b]">
                    {section2.description}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: 文左图右 */}
        {section3.description && (
          <section className="bg-white">
            <div className="max-w-[1344px] mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="w-full py-12 px-10 md:px-16">
                  <p className="text-xl md:text-2xl leading-relaxed text-[#26548b]">
                    {section3.description}
                  </p>
                </div>
                <div className="w-full aspect-[4/3] max-h-[400px] lg:max-h-none overflow-hidden rounded-lg">
                  <img
                    src={section3.image || '/images/about-us/about-us-2.png'}
                    alt="About Us"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
