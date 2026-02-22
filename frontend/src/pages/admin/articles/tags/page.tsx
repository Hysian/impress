import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTags, createTag, deleteTag } from "@/api/articles";
import type { Tag } from "@/api/articles";

export default function TagsPage() {
  const navigate = useNavigate();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // New tag form
  const [showNew, setShowNew] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newZhName, setNewZhName] = useState("");
  const [newEnName, setNewEnName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTags();
      setTags(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = async () => {
    if (!newSlug.trim() || !newZhName.trim()) {
      setError("Slug and Chinese name are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createTag({
        slug: newSlug,
        zhName: newZhName,
        enName: newEnName,
      });
      setTags((prev) => [...prev, created]);
      setShowNew(false);
      setNewSlug("");
      setNewZhName("");
      setNewEnName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.zhName || tag.enName}"?`)) return;

    setDeleting(tag.id);
    setError(null);
    try {
      await deleteTag(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/admin/articles")}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center text-sm"
          >
            &larr; Back to Articles
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          {showNew ? "Cancel" : "New Tag"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* New tag form */}
      {showNew && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Tag</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="tag-slug"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Name</label>
              <input
                type="text"
                value={newZhName}
                onChange={(e) => setNewZhName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Chinese name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">English Name</label>
              <input
                type="text"
                value={newEnName}
                onChange={(e) => setNewEnName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="English name"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      ) : tags.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No tags yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full"
              >
                <span className="text-sm text-gray-800">
                  {tag.zhName || tag.enName}
                </span>
                <span className="text-xs text-gray-400">({tag.slug})</span>
                <button
                  onClick={() => handleDelete(tag)}
                  disabled={deleting === tag.id}
                  className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title="Delete tag"
                >
                  {deleting === tag.id ? "..." : "\u00d7"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
