import type { SectionProps } from "../types";

export interface HeroSectionData {
  title?: string;
  subtitle?: string;
  label?: string;
  backgroundImage?: string;
  backgroundColor?: string;
}

export default function HeroSection({ data }: SectionProps<HeroSectionData>) {
  const { title, subtitle, label, backgroundImage, backgroundColor } = data;
  const useImage = !backgroundColor;
  const src = useImage ? (backgroundImage || "/images/hero-bg.png") : undefined;

  return (
    <section
      className={
        useImage
          ? "relative h-[280px] sm:h-[360px] md:h-[440px] lg:h-[560px]"
          : "relative h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px]"
      }
    >
      <div
        className="absolute inset-0"
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        {src && (
          <>
            <img
              src={src}
              alt="Hero Background"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
      </div>
      <div className="absolute left-0 right-0 bottom-[20%] z-10">
        <div className="max-w-layout w-full mx-auto px-4 md:px-6">
          {label && (
            <p className="text-white text-sm sm:text-base mb-1">{label}</p>
          )}
          {title && (
            <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
              {title}
              {subtitle && (
                <span className="block mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl lg:text-3xl font-normal">
                  {subtitle}
                </span>
              )}
            </h1>
          )}
        </div>
      </div>
    </section>
  );
}
