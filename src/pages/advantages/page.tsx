import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

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

/** 5 张图放在 public/images/advantage/ 下：1.png ~ 5.png */
const ADVANTAGE_IMAGES = [
  { src: '/images/advantage/1.png', alt: 'Advantage 1' },
  { src: '/images/advantage/2.png', alt: 'Advantage 2' },
  { src: '/images/advantage/3.png', alt: 'Advantage 3' },
  { src: '/images/advantage/4.png', alt: 'Advantage 4' },
  { src: '/images/advantage/5.png', alt: 'Advantage 5' },
];

const BLOCK_KEYS = ['block1', 'block2', 'block3', 'block4', 'block5'] as const;

export default function AdvantagesPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={t('advantagesPage.hero.label')}
        title={t('advantagesPage.hero.title')}
        alt="Our Advantages Hero"
      />

      {/* 5 个优势区块整体：仅整体与 hero/footer 保持上下边距 */}
      <div className="py-12 md:py-16 lg:py-24 bg-white">
        {BLOCK_KEYS.map((key, index) => {
          const isImageLeft = index % 2 === 0;
          const image = ADVANTAGE_IMAGES[index];
          const title = t(`advantagesPage.${key}.title`);
          const description = t(`advantagesPage.${key}.description`);
          return (
            <section
              key={key}
              className="bg-white"
            >
              <div className="max-w-[1344px] mx-auto px-4 md:px-6 mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
                  {isImageLeft ? (
                    <>
                      <AdvantageBlockImage
                        src={image.src}
                        alt={image.alt}
                        className="order-2 lg:order-1"
                      />
                      <AdvantageBlockText
                        title={title}
                        description={description}
                        className="order-1 lg:order-2"
                      />
                    </>
                  ) : (
                    <>
                      <AdvantageBlockText title={title} description={description} />
                      <AdvantageBlockImage src={image.src} alt={image.alt} />
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
