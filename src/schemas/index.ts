import type { PageSchema } from "@/types/schema";
import { homeSchema } from "./home";
import { aboutSchema } from "./about";
import { advantagesSchema } from "./advantages";
import { coreServicesSchema } from "./core-services";
import { casesSchema } from "./cases";
import { expertsSchema } from "./experts";
import { contactSchema } from "./contact";
import { globalSchema } from "./global";

const schemaRegistry: Record<string, PageSchema> = {
  home: homeSchema,
  about: aboutSchema,
  advantages: advantagesSchema,
  "core-services": coreServicesSchema,
  cases: casesSchema,
  experts: expertsSchema,
  contact: contactSchema,
  global: globalSchema,
};

export function getPageSchema(pageKey: string): PageSchema | undefined {
  return schemaRegistry[pageKey];
}

export { schemaRegistry };
