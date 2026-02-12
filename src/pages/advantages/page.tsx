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

interface AdvantageBlock {
  title?: string;
  description?: string;
  image?: string;
}

interface AdvantagesPageConfig {
  hero?: HeroConfig;
  blocks?: AdvantageBlock[];
}

/** 优势区块 - 图片 */
function AdvantageBlockImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full aspect-[4/3] max-h-[400px] lg:max-h-none overflow-hidden rounded-lg ${className}`.trim()}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}

/** 优势区块 - 标题与描述 */
function AdvantageBlockText({
  title,
  description,
  className = '',
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`w-full h-full py-12 px-10 md:px-16 ${className}`.trim()}>
      <h2 className="text-3xl md:text-4xl font-bold text-[#1a5f8f] mb-4">
        {title}
      </h2>
      <p className="text-2xl md:text-3xl leading-relaxed text-[#26548b]">
        {description}
      </p>
    </div>
  );
}

export default function AdvantagesPage() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language === 'zh' || i18n.language.startsWith('zh') ? 'zh' : 'en') as Locale;

  const { loading, error, config } = usePublicContent('advantages', {
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

  const pageConfig = (config as AdvantagesPageConfig) || {};
  const hero = pageConfig.hero || {};
  const blocks = pageConfig.blocks || [];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={hero.label || ''}
        title={hero.title || ''}
        alt="Our Advantages Hero"
      />

      {/* 5 个优势区块整体：仅整体与 hero/footer 保持上下边距 */}
      <div className="py-12 md:py-16 lg:py-24 bg-white">
        {blocks.map((block, index) => {
          if (!block.title || !block.description) return null;
          const isImageLeft = index % 2 === 0;
          const imageSrc = block.image || `/images/advantage/${index + 1}.png`;
          return (
            <section
              key={index}
              className="bg-white"
            >
              <div className="max-w-[1344px] mx-auto px-4 md:px-6 mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
                  {isImageLeft ? (
                    <>
                      <AdvantageBlockImage
                        src={imageSrc}
                        alt={block.title}
                        className="order-2 lg:order-1"
                      />
                      <AdvantageBlockText
                        title={block.title}
                        description={block.description}
                        className="order-1 lg:order-2"
                      />
                    </>
                  ) : (
                    <>
                      <AdvantageBlockText title={block.title} description={block.description} />
                      <AdvantageBlockImage src={imageSrc} alt={block.title} />
                    </>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <Footer />
    </div>
  );
}
