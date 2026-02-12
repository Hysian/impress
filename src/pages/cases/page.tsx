import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

const CASE_KEYS = ['case1', 'case2', 'case3', 'case4'] as const;

export default function CasesPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={t('caseListPage.hero.label')}
        title={t('caseListPage.hero.title')}
        alt="Case List Hero"
        imageSrc="/images/case-hero-bg.png"
      />

      <section className="py-12 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          <div className="space-y-10 md:space-y-14">
            {CASE_KEYS.map((key) => {
              const title = t(`caseListPage.${key}.title`);
              const itemsText = t(`caseListPage.${key}.items`);
              const items = itemsText.split(/\n/).filter(Boolean);
              return (
                <div key={key}>
                  <h2 className="text-xl md:text-2xl font-bold text-[#1a5f8f] mb-4">
                    {title}
                  </h2>
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
