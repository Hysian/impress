import { useTranslation } from 'react-i18next';
import { PublicLayout } from '@/theme/layouts';
import { usePublicContent } from '@/hooks/usePublicContent';
import type { Locale } from '@/api/publicContent';

interface HeroConfig {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
}

interface AboutConfig {
  title?: string;
  description?: string;
  description2?: string;
  description3?: string;
  button?: string;
  image?: string;
}

interface AdvantageCard {
  title?: string;
  titleEn?: string;
  description?: string;
  image?: string;
}

interface AdvantagesConfig {
  title?: string;
  cards?: AdvantageCard[];
}

interface CoreService {
  title?: string;
  description?: string;
  link?: string;
  image?: string;
}

interface CoreServicesConfig {
  title?: string;
  services?: CoreService[];
}

interface HomePageConfig {
  hero?: HeroConfig;
  about?: AboutConfig;
  advantages?: AdvantagesConfig;
  coreServices?: CoreServicesConfig;
}

export default function HomePage() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;
  const isZh = locale === 'zh';

  const { loading, error, config } = usePublicContent('home', {
    locale,
    autoNormalize: true,
  });

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-gray-600">Loading...</div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-red-600">Failed to load page content</div>
        </div>
      </PublicLayout>
    );
  }

  const pageConfig = (config as HomePageConfig) || {};
  const hero = pageConfig.hero || {};
  const about = pageConfig.about || {};
  const advantages = pageConfig.advantages || {};
  const coreServices = pageConfig.coreServices || {};

  return (
    <PublicLayout>

      {/* Hero Section - 移动端高度与文字适配 */}
      <section className="relative h-[280px] sm:h-[360px] md:h-[440px] lg:h-[560px] flex items-center justify-center">
        <div className="absolute inset-0">
          <img
            src={hero.backgroundImage || '/images/hero-bg.png'}
            alt="Hero Background"
            className="w-full h-full object-cover sm:object-contain object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
        </div>
        <div className="absolute bottom-6 sm:bottom-12 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center text-white px-4 w-full max-w-layout">
          <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl mb-2 sm:mb-4">
            {hero.title || ''}
            {hero.subtitle && (
              <span className="block mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl lg:text-3xl font-normal">
                {hero.subtitle}
              </span>
            )}
          </h1>
        </div>
      </section>

      {/* About Section - 移动端单列、图文顺序、按钮全宽 */}
      <section id="about" className="py-10 sm:py-16 md:py-24 bg-white">
        <div className="max-w-layout w-full mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="w-full h-[220px] sm:h-[320px] lg:h-[400px] order-2 lg:order-1">
              <img
                src={about.image || '/images/about-us.png'}
                alt="About Us"
                className="w-full h-full object-cover object-top rounded-lg"
              />
            </div>
            <div className="order-1 lg:order-2 min-h-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                {about.title || ''}
              </h2>
              {about.description && (
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                  {about.description}
                </p>
              )}
              {about.description2 && (
                <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                  {about.description2}
                </p>
              )}
              {about.description3 && (
                <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                  {about.description3}
                </p>
              )}
              {about.button && (
                <div className="flex justify-end sm:float-right">
                  <button className="w-full sm:w-auto bg-accent text-white px-6 sm:px-8 py-3 rounded-md hover:bg-accent-hover transition-colors text-sm font-medium whitespace-nowrap cursor-pointer">
                    {about.button}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Advantages Section - 移动端 2x2 网格，标题区不换行 */}
      {advantages.title && (
        <section id="services" className="py-10 sm:py-16 md:py-24">
          <div className="max-w-layout w-full mx-auto px-4 sm:px-6">
            <div className="flex items-center mb-8 sm:mb-12">
              <div className="w-5 h-5 sm:w-[26px] sm:h-[26px] bg-accent mr-2 sm:mr-3 flex-shrink-0 rounded-sm" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate min-w-0">
                {advantages.title}
              </h2>
              <span className="ml-1 sm:ml-2 text-xl sm:text-2xl text-accent flex-shrink-0 cursor-pointer">&gt;</span>
            </div>
            {advantages.cards && advantages.cards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                {advantages.cards.map((card, index) => (
                  <div
                    key={index}
                    className="group relative w-full sm:aspect-auto overflow-hidden"
                  >
                    <img
                      src={card.image || `/images/advantage-${index + 1}.png`}
                      alt={card.title || `Advantage ${index + 1}`}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-amber-50/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4 sm:p-5 text-center">
                      {card.title && (
                        <h3 className="text-primary text-lg sm:text-xl md:text-2xl font-bold mb-3 w-full">
                          {card.title}
                        </h3>
                      )}
                      {isZh && card.titleEn && (
                        <p className="text-primary/80 text-xs sm:text-sm mb-2 w-full">
                          {card.titleEn}
                        </p>
                      )}
                      {card.description && (
                        <p className="text-amber-900 text-sm sm:text-base font-normal leading-loose max-w-[92%] sm:max-w-xs line-clamp-4 sm:line-clamp-5 text-left">
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Core Services Section - 移动端单列、图文上下堆叠 */}
      {coreServices.title && (
        <section id="core-services" className="py-10 sm:py-16 md:py-24 bg-white">
          <div className="max-w-layout w-full h-full mx-auto px-4 sm:px-6">
            <div className="flex items-center mb-8 sm:mb-12">
              <div className="w-5 h-5 sm:w-[26px] sm:h-[26px] bg-accent mr-2 sm:mr-3 flex-shrink-0 rounded-sm" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary truncate min-w-0">
                {coreServices.title}
              </h2>
              <span className="ml-1 sm:ml-2 text-xl sm:text-2xl text-accent flex-shrink-0 cursor-pointer">&gt;</span>
            </div>
            {coreServices.services && coreServices.services.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-x-8 sm:gap-y-10">
                {coreServices.services.map((service, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-0 rounded-lg sm:rounded-none bg-gray-50/80 sm:bg-transparent">
                    <div className="w-full h-[180px] sm:w-[320px] sm:h-[240px] flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                      <img
                        src={service.image || `/images/service-${index + 1}.png`}
                        alt={service.title || `Service ${index + 1}`}
                        className="w-full h-full object-cover object-top sm:object-contain sm:object-center"
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      {service.title && (
                        <h3 className="text-base font-bold text-primary mb-1 sm:mb-2">
                          {service.title}
                        </h3>
                      )}
                      {service.description && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-2 sm:mb-3 line-clamp-3 sm:line-clamp-none">
                          {service.description}
                        </p>
                      )}
                      {service.link && (
                        <a href="#" className="text-sm font-bold text-primary hover:text-accent transition-colors cursor-pointer">
                          {service.link}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </PublicLayout>
  );
}
