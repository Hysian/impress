import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

/** 服务区块 - 图片 */
function ServiceBlockImage({
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

/** 服务区块 - 标题与描述 */
function ServiceBlockText({
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
      <h2 className="text-xl md:text-2xl font-bold text-[#1a5f8f] mb-4">
        {title}
      </h2>
      <p className="text-base text-gray-700 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/** 图片在 public/images/service/ 下：1.png、2.png、3.png */
const SERVICE_IMAGES = [
  { src: '/images/service/1.png', alt: 'Service 1' },
  { src: '/images/service/2.png', alt: 'Service 2' },
  { src: '/images/service/3.png', alt: 'Service 3' },
];

const SERVICE_KEYS = ['service1', 'service2', 'service3'] as const;

export default function CoreServicesPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        label={t('coreServicesPage.hero.label')}
        title={t('coreServicesPage.hero.title')}
        alt="Core Services Hero"
      />

      <div className="py-12 md:py-16 lg:py-24 bg-white">
        {SERVICE_KEYS.map((key, index) => {
          const isImageLeft = index % 2 === 0;
          const image = SERVICE_IMAGES[index];
          const title = t(`coreServicesPage.${key}.title`);
          const description = t(`coreServicesPage.${key}.description`);
          return (
            <section key={key} className="bg-white">
              <div className="max-w-[1344px] mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
                  {isImageLeft ? (
                    <>
                      <ServiceBlockImage
                        src={image.src}
                        alt={image.alt}
                        className="order-2 lg:order-1"
                      />
                      <ServiceBlockText
                        title={title}
                        description={description}
                        className="order-1 lg:order-2"
                      />
                    </>
                  ) : (
                    <>
                      <ServiceBlockText title={title} description={description} />
                      <ServiceBlockImage src={image.src} alt={image.alt} />
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
