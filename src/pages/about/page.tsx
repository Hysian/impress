import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

/** 关于我们页面正文区两张图：放在 public/images/about-us/ 下，如 1.png、2.png */
const ABOUT_IMAGES = [
  { src: '/images/about-us/about-us-1.png', alt: 'About Us' },
  { src: '/images/about-us/about-us-2.png', alt: 'About Us' },
];

export default function AboutPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={t('aboutPage.hero.label')}
        title={t('aboutPage.hero.title')}
        alt="About Us Hero"
      />

      {/* Section 1: 公司简介 - 标题左、描述右 */}
      <section className="py-12 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12">
            <div className="lg:col-span-3 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a5f8f] uppercase">
                {t('aboutPage.companyProfile.title')}
              </h2>
            </div>
            <div className="lg:col-span-9">
              <p className="text-2xl  md:text-3xl leading-relaxed text-[#26548b]">
                {t('aboutPage.companyProfile.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 公司简介下方：两段图文区块，样式与我们的优势一致 */}
      <div className="py-12 md:py-16 lg:py-24 bg-white">
        {/* Section 2: 图左文右 */}
        <section className="bg-white">
          <div className="max-w-[1344px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="w-full aspect-[4/3] max-h-[400px] lg:max-h-none overflow-hidden rounded-lg order-2 lg:order-1">
                <img
                  src={ABOUT_IMAGES[0].src}
                  alt={ABOUT_IMAGES[0].alt}
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="w-full py-12 px-10 md:px-16 order-1 lg:order-2">
                <p className="text-xl md:text-2xl leading-relaxed text-[#26548b]">
                  {t('aboutPage.section2.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: 文左图右 */}
        <section className="bg-white">
          <div className="max-w-[1344px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="w-full py-12 px-10 md:px-16">
                <p className="text-xl md:text-2xl leading-relaxed text-[#26548b]">
                  {t('aboutPage.section3.description')}
                </p>
              </div>
              <div className="w-full aspect-[4/3] max-h-[400px] lg:max-h-none overflow-hidden rounded-lg">
                <img
                  src={ABOUT_IMAGES[1].src}
                  alt={ABOUT_IMAGES[1].alt}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
