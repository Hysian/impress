import type { ReactNode } from "react";
import type { SectionData, SectionSettings } from "../types";
import { sectionRegistry } from "./index";

interface SectionWrapperProps {
  settings?: SectionSettings;
  children: ReactNode;
}

function SectionWrapper({ settings, children }: SectionWrapperProps) {
  if (settings?.hidden) return null;

  const bgClass =
    settings?.background === "primary"
      ? "bg-primary"
      : settings?.background === "surface-alt"
        ? "bg-gray-50"
        : "bg-white";

  const padClass =
    settings?.padding === "lg"
      ? "py-12 md:py-16 lg:py-24"
      : settings?.padding === "sm"
        ? "py-6 md:py-8"
        : settings?.padding === "none"
          ? ""
          : "py-10 sm:py-16 md:py-20";

  return (
    <section className={`${bgClass} ${padClass}`}>
      {children}
    </section>
  );
}

interface SectionRendererProps {
  section: SectionData;
}

export default function SectionRenderer({ section }: SectionRendererProps) {
  const Component = sectionRegistry[section.type];

  if (!Component) {
    if (import.meta.env.DEV) {
      return (
        <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded mx-4 my-2">
          Unknown section type: <code>{section.type}</code>
        </div>
      );
    }
    return null;
  }

  return (
    <SectionWrapper settings={section.settings}>
      <Component data={section.data} settings={section.settings} />
    </SectionWrapper>
  );
}
