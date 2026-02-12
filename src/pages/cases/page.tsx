import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';
import { usePublicContent } from '@/hooks/usePublicContent';
import type { Locale } from '@/api/publicContent';

interface HeroConfig {
  label?: string;
  title?: string;
  imageSrc?: string;
}

interface CaseCategory {
  title?: string;
  items?: string[];
}

interface CasesPageConfig {
  hero?: HeroConfig;
  categories?: CaseCategory[];
}

export default function CasesPage() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;

  const { loading, error, config } = usePublicContent('cases', {
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

  const pageConfig = (config as CasesPageConfig) || {};
  const hero = pageConfig.hero || {};
  const categories = pageConfig.categories || [];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={hero.label}
        title={hero.title}
        alt="Case List Hero"
        imageSrc={hero.imageSrc || '/images/case-hero-bg.png'}
      />

      <section className="py-12 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          <div className="space-y-10 md:space-y-14">
            {categories.map((category, index) => {
              const items = category.items || [];
              if (!category.title && items.length === 0) return null;
              return (
                <div key={index}>
                  {category.title && (
                    <h2 className="text-xl md:text-2xl font-bold text-[#1a5f8f] mb-4">
                      {category.title}
                    </h2>
                  )}
                  {items.length > 0 && (
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-base text-gray-700 leading-relaxed"
                        >
                          <span className="text-[#1a5f8f] flex-shrink-0" aria-hidden>
                          ✅
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
