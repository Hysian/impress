import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';

const ADVANTAGE_IMAGES = [
  { src: '/images/advantage-1.png', alt: 'Advantage 1' },
  { src: '/images/advantage-2.png', alt: 'Advantage 2' },
  { src: '/images/advantage-3.png', alt: 'Advantage 3' },
  { src: '/images/advantage-4.png', alt: 'Advantage 4' },
];

const CORE_SERVICES = [
  {
    imgSrc: '/images/service-1.png',
    alt: 'Service 1',
    i18nKey: 'service1',
  },
  {
    imgSrc: '/images/service-2.png',
    alt: 'Service 2',
    i18nKey: 'service2',
  },
  {
    imgSrc: '/images/service-3.png',
    alt: 'Service 3',
    i18nKey: 'service3',
  }
];

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section - 移动端高度与文字适配 */}
      <section className="relative h-[280px] sm:h-[360px] md:h-[440px] lg:h-[560px] flex items-center justify-center">
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.png"
            alt="Hero Background"
            className="w-full h-full object-cover sm:object-contain object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/40" />
        </div>
        <div className="absolute bottom-6 sm:bottom-12 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center text-white px-4 w-full max-w-[1344px]">
          <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl mb-2 sm:mb-4">
            {t('hero.title')}
            <span className="block mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl lg:text-3xl font-normal">
              {t('hero.subtitle')}
            </span>
          </h1>
        </div>
      </section>

      {/* About Section - 移动端单列、图文顺序、按钮全宽 */}
      <section id="about" className="py-10 sm:py-16 md:py-24 bg-white">
        <div className="max-w-[1344px] w-full mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="w-full h-[220px] sm:h-[320px] lg:h-[400px] order-2 lg:order-1">
              <img
                src="/images/about-us.png"
                alt="About Us"
                className="w-full h-full object-cover object-top rounded-lg"
              />
            </div>
            <div className="order-1 lg:order-2 min-h-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                {t('about.title')}
              </h2>
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                {t('about.description')}
              </p>
              <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                {t('about.description2')}
              </p>
              <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                {t('about.description3')}
              </p>
              <div className="flex justify-end sm:float-right">
                <button className="w-full sm:w-auto bg-[#8bc34a] text-white px-6 sm:px-8 py-3 rounded-md hover:bg-[#7cb342] transition-colors text-sm font-medium whitespace-nowrap cursor-pointer">
                  {t('about.button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages Section - 移动端 2x2 网格，标题区不换行 */}
      <section id="services" className="py-10 sm:py-16 md:py-24">
        <div className="max-w-[1344px] w-full mx-auto px-4 sm:px-6">
          <div className="flex items-center mb-8 sm:mb-12">
            <div className="w-5 h-5 sm:w-[26px] sm:h-[26px] bg-[#8bc34a] mr-2 sm:mr-3 flex-shrink-0 rounded-sm" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate min-w-0">
              {t('advantages.title')}
            </h2>
            <span className="ml-1 sm:ml-2 text-xl sm:text-2xl text-[#8bc34a] flex-shrink-0 cursor-pointer">&gt;</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {ADVANTAGE_IMAGES.map((item, index) => {
              const cardKey = `card${index + 1}` as 'card1' | 'card2' | 'card3' | 'card4';
              return (
                <div
                  key={index}
                  className="group relative w-full sm:aspect-auto overflow-hidden"
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-amber-50/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-4 sm:p-5 text-center">
                    <h3 className="text-[#1a5f8f] text-lg sm:text-xl md:text-2xl font-bold mb-3 w-full">
                      {t(`advantages.${cardKey}.title`)}
                    </h3>
                    {isZh && (
                      <p className="text-[#1a5f8f]/80 text-xs sm:text-sm mb-2 w-full">
                        {t(`advantages.${cardKey}.titleEn`)}
                      </p>
                    )}
                    <p className="text-amber-900 text-sm sm:text-base font-normal leading-loose max-w-[92%] sm:max-w-xs line-clamp-4 sm:line-clamp-5 text-left">
                      {t(`advantages.${cardKey}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Services Section - 移动端单列、图文上下堆叠 */}
      <section id="core-services" className="py-10 sm:py-16 md:py-24 bg-white">
        <div className="max-w-[1344px] w-full h-full mx-auto px-4 sm:px-6">
          <div className="flex items-center mb-8 sm:mb-12">
            <div className="w-5 h-5 sm:w-[26px] sm:h-[26px] bg-[#8bc34a] mr-2 sm:mr-3 flex-shrink-0 rounded-sm" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a5f8f] truncate min-w-0">
              {t('coreServices.title')}
            </h2>
            <span className="ml-1 sm:ml-2 text-xl sm:text-2xl text-[#8bc34a] flex-shrink-0 cursor-pointer">&gt;</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-x-8 sm:gap-y-10">
            {CORE_SERVICES.map((service, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-0 rounded-lg sm:rounded-none bg-gray-50/80 sm:bg-transparent">
                <div className="w-full h-[180px] sm:w-[320px] sm:h-[240px] flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={service.imgSrc}
                    alt={service.alt}
                    className="w-full h-full object-cover object-top sm:object-contain sm:object-center"
                  />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h3 className="text-base font-bold text-[#1a5f8f] mb-1 sm:mb-2">
                    {t(`coreServices.${service.i18nKey}.title`)}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2 sm:mb-3 line-clamp-3 sm:line-clamp-none">
                    {t(`coreServices.${service.i18nKey}.description`)}
                  </p>
                  <a href="#" className="text-sm font-bold text-[#1a5f8f] hover:text-[#8bc34a] transition-colors cursor-pointer">
                    {t(`coreServices.${service.i18nKey}.link`)}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
