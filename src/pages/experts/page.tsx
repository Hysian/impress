import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

/** 专家头像在 public/images/expert 下 */
const EXPERTS = [
  { id: 'xuetian' as const, image: 'XueTian.png' },
  { id: 'daiqiu' as const, image: 'DaiQiu.png' },
];

export default function ExpertsPage() {
  const { t } = useTranslation('common');
  const [activeId, setActiveId] = useState<'xuetian' | 'daiqiu'>('xuetian');

  const activeExpert = EXPERTS.find((e) => e.id === activeId) ?? EXPERTS[0];
  const bioText = t(`expertTeamPage.experts.${activeExpert.id}.bio`);
  const bioParagraphs = bioText.split(/\n\n+/).filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={t('expertTeamPage.hero.label')}
        title={t('expertTeamPage.hero.title')}
        alt="Expert Team Hero"
      />

      {/* 专家介绍 */}
      <section className="py-12 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          {/* 区块标题 */}
          <div className="flex items-center mb-10 md:mb-12">
            <div className="w-[26px] h-[26px] bg-[#8bc34a] mr-3 flex-shrink-0 rounded-full" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('expertTeamPage.sectionTitle')}
            </h2>
          </div>

          {/* 专家头像 + 姓名职位 */}
          <div className="grid grid-cols-2 gap-8 md:gap-12 max-w-2xl mx-auto mb-12 md:mb-16">
            {EXPERTS.map(({ id, image }) => (
              <div key={id} className="flex flex-col items-center text-center">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 mb-3">
                  <img
                    src={`/images/expert/${image}`}
                    alt={t(`expertTeamPage.experts.${id}.name`)}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#1a5f8f]">
                  {t(`expertTeamPage.experts.${id}.name`)}
                </h3>
                <p className="text-sm text-gray-500">
                  {t(`expertTeamPage.experts.${id}.title`)}
                </p>
              </div>
            ))}
          </div>

          {/* 左侧 Tab + 右侧简介正文 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-3 flex lg:flex-col gap-2">
              {EXPERTS.map(({ id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveId(id)}
                  className={`px-4 py-3 text-left rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeId === id
                      ? 'bg-[#1a5f8f] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t(`expertTeamPage.experts.${id}.name`)}
                </button>
              ))}
            </div>
            <div className="lg:col-span-9 bg-white rounded-lg border border-gray-100 p-6 md:p-8">
              {bioParagraphs.map((para, i) => (
                <p key={i} className="text-base text-gray-700 leading-relaxed mb-4 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
