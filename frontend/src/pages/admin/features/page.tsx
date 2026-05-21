import { useEffect, useState } from "react";
import {
  fetchAdminFeatures,
  putAdminFeaturesDraft,
  publishAdminFeatures,
} from "@/api/features";
import { SITE_CONFIG_FEATURES_DEFAULT, type SiteConfigFeatures } from "@/types/siteConfig";

const PUBLIC_PAGE_KEYS: Array<keyof SiteConfigFeatures["publicPages"]> = [
  "home", "blog", "contact",
  "about", "experts", "coreServices", "advantages", "cases",
];

function isFeaturesShape(v: unknown): v is SiteConfigFeatures {
  return !!v && typeof v === "object" && "publicPages" in (v as Record<string, unknown>);
}

export default function AdminFeaturesPage() {
  const [draft, setDraft] = useState<SiteConfigFeatures>(SITE_CONFIG_FEATURES_DEFAULT);
  const [draftVersion, setDraftVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminFeatures()
      .then((s) => {
        if (isFeaturesShape(s.draftConfig)) {
          setDraft(s.draftConfig);
        } else if (isFeaturesShape(s.publishedConfig)) {
          setDraft(s.publishedConfig);
        }
        setDraftVersion(s.draftVersion);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggle(key: keyof SiteConfigFeatures["publicPages"]) {
    setDraft((d) => ({
      ...d,
      publicPages: { ...d.publicPages, [key]: !d.publicPages[key] },
    }));
  }

  async function save() {
    setStatus("");
    try {
      const r = await putAdminFeaturesDraft(draft, draftVersion);
      setDraftVersion(r.draftVersion);
      setStatus("Draft saved (v" + r.draftVersion + ")");
    } catch (e) {
      setStatus("Save failed: " + (e as Error).message);
    }
  }

  async function publish() {
    setStatus("");
    try {
      const r = await publishAdminFeatures();
      setStatus("Published v" + r.publishedVersion);
    } catch (e) {
      setStatus("Publish failed: " + (e as Error).message);
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Features</h1>
      <p className="text-sm text-gray-500 mb-4">Draft v{draftVersion}</p>
      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-600 mb-2">Public pages</h2>
        <ul className="space-y-2">
          {PUBLIC_PAGE_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`pp-${key}`}
                checked={draft.publicPages[key]}
                onChange={() => toggle(key)}
              />
              <label htmlFor={`pp-${key}`} className="text-sm">/{key}</label>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex gap-2 items-center">
        <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">Save Draft</button>
        <button onClick={publish} className="px-4 py-2 bg-green-600 text-white rounded">Publish</button>
        {status && <span className="text-sm text-gray-700">{status}</span>}
      </div>
    </div>
  );
}
