import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAdminArticle,
  createArticle,
  updateArticle,
  getCategories,
  getTags,
} from "@/api/articles";
import type { Article, Category, Tag } from "@/api/articles";

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  // Form state
  const [zhTitle, setZhTitle] = useState("");
  const [enTitle, setEnTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [coverImage, setCoverImage] = useState("");
  const [zhBody, setZhBody] = useState("");
  const [enBody, setEnBody] = useState("");
  const [zhSeoTitle, setZhSeoTitle] = useState("");
  const [enSeoTitle, setEnSeoTitle] = useState("");
  const [zhMetaDescription, setZhMetaDescription] = useState("");
  const [enMetaDescription, setEnMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");

  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSeo, setShowSeo] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Load categories and tags
  const loadMeta = useCallback(async () => {
    try {
      const [cats, tgs] = await Promise.all([getCategories(), getTags()]);
      setCategories(cats || []);
      setTags(tgs || []);
    } catch {
      // Non-critical — selectors will just be empty
    }
  }, []);

  // Load article for editing
  const loadArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const article = await getAdminArticle(Number(id));
      setZhTitle(article.zhTitle || "");
      setEnTitle(article.enTitle || "");
      setSlug(article.slug || "");
      setCategoryId(article.categoryId);
      setSelectedTagIds(article.tags?.map((t) => t.id) || []);
      setCoverImage(article.coverImage || "");
      setZhBody(article.zhBody || "");
      setEnBody(article.enBody || "");
      setZhSeoTitle(article.zhSeoTitle || "");
      setEnSeoTitle(article.enSeoTitle || "");
      setZhMetaDescription(article.zhMetaDescription || "");
      setEnMetaDescription(article.enMetaDescription || "");
      setOgImage(article.ogImage || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeta();
    if (isEditing) {
      loadArticle();
    }
  }, [loadMeta, loadArticle, isEditing]);

  const buildPayload = (status: "draft" | "published"): Partial<Article> => {
    const payload: Partial<Article> = {
      zhTitle,
      enTitle,
      slug,
      categoryId,
      coverImage,
      zhBody,
      enBody,
      zhSeoTitle,
      enSeoTitle,
      zhMetaDescription,
      enMetaDescription,
      ogImage,
      status,
    };
    if (status === "published") {
      payload.publishedAt = new Date().toISOString();
    }
    // Tag IDs sent as a separate field - backend expects tagIds
    (payload as Record<string, unknown>).tagIds = selectedTagIds;
    return payload;
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(status);
      if (isEditing) {
        await updateArticle(Number(id), payload);
      } else {
        await createArticle(payload);
      }
      navigate("/admin/articles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin/articles")}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center text-sm"
          >
            &larr; Back to Articles
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Article" : "New Article"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/articles")}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Info</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chinese Title
                </label>
                <input
                  type="text"
                  value={zhTitle}
                  onChange={(e) => setZhTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter Chinese title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  English Title
                </label>
                <input
                  type="text"
                  value={enTitle}
                  onChange={(e) => setEnTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Enter English title"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="article-url-slug"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL-friendly identifier (letters, numbers, hyphens)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={categoryId ?? ""}
                  onChange={(e) =>
                    setCategoryId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.zhName || cat.enName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>

            {coverImage && (
              <div className="mt-2">
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="max-h-40 rounded border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              {tags.length === 0 ? (
                <p className="text-sm text-gray-400">No tags available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {tag.zhName || tag.enName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chinese Body
              </label>
              <textarea
                value={zhBody}
                onChange={(e) => setZhBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                placeholder="Enter Chinese content (Markdown supported)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                English Body
              </label>
              <textarea
                value={enBody}
                onChange={(e) => setEnBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                placeholder="Enter English content (Markdown supported)"
              />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <button
            onClick={() => setShowSeo(!showSeo)}
            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>
            <span className="text-gray-400 text-sm">
              {showSeo ? "Collapse" : "Expand"}
            </span>
          </button>
          {showSeo && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chinese SEO Title
                  </label>
                  <input
                    type="text"
                    value={zhSeoTitle}
                    onChange={(e) => setZhSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="SEO title (Chinese)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English SEO Title
                  </label>
                  <input
                    type="text"
                    value={enSeoTitle}
                    onChange={(e) => setEnSeoTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="SEO title (English)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chinese Meta Description
                  </label>
                  <textarea
                    value={zhMetaDescription}
                    onChange={(e) => setZhMetaDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Meta description (Chinese)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    English Meta Description
                  </label>
                  <textarea
                    value={enMetaDescription}
                    onChange={(e) => setEnMetaDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Meta description (English)"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OG Image URL
                </label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
