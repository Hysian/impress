import { http } from "./http";
import type { SiteConfigFeatures } from "@/types/siteConfig";

export interface FeaturesState {
  draftConfig: SiteConfigFeatures;
  draftVersion: number;
  publishedConfig: SiteConfigFeatures;
  publishedVersion: number;
}

export async function fetchAdminFeatures(): Promise<FeaturesState> {
  const r = await http.get<FeaturesState>("/admin/features");
  return r.data;
}

export async function putAdminFeaturesDraft(
  cfg: SiteConfigFeatures,
  expectedDraftVersion: number,
): Promise<{ draftVersion: number }> {
  const r = await http.put<{ draftVersion: number }>("/admin/features/draft", {
    draftConfig: cfg,
    expectedDraftVersion,
  });
  return r.data;
}

export async function publishAdminFeatures(): Promise<{ publishedVersion: number }> {
  const r = await http.post<{ publishedVersion: number }>("/admin/features/publish");
  return r.data;
}
