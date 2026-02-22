export interface SectionData {
  id: string;
  type: string;
  data: Record<string, unknown>;
  settings?: SectionSettings;
}

export interface SectionSettings {
  background?: "surface" | "surface-alt" | "primary" | string;
  padding?: "none" | "sm" | "md" | "lg";
  maxWidth?: "layout" | "full" | string;
  hidden?: boolean;
}

export interface SectionProps<T = Record<string, unknown>> {
  data: T;
  settings?: SectionSettings;
}

export interface SectionMeta {
  type: string;
  label: string;
  labelZh: string;
  icon?: string;
}

export interface PageConfig {
  layout?: string;
  sections: SectionData[];
}
