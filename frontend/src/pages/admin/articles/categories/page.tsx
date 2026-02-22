import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/api/articles";
import type { Category } from "@/api/articles";

export default function CategoriesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editZhName, setEditZhName] = useState("");
  const [editEnName, setEditEnName] = useState("");
  const [saving, setSaving] = useState(false);

  // New category form
  const [showNew, setShowNew] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newZhName, setNewZhName] = useState("");
  const [newEnName, setNewEnName] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async () => {
    if (!newSlug.trim() || !newZhName.trim()) {
      setError("Slug and Chinese name are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCategory({
        slug: newSlug,
        zhName: newZhName,
        enName: newEnName,
      });
      setCategories((prev) => [...prev, created]);
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

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditSlug(cat.slug);
    setEditZhName(cat.zhName);
    setEditEnName(cat.enName);
  };

  const handleUpdate = async () => {
    if (!editingId || !editSlug.trim() || !editZhName.trim()) {
      setError("Slug and Chinese name are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateCategory(editingId, {
        slug: editSlug,
        zhName: editZhName,
        enName: editEnName,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === editingId ? updated : c))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.zhName || cat.enName}"?`)) return;

    setDeleting(cat.id);
    setError(null);
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
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
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          {showNew ? "Cancel" : "New Category"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* New category form */}
      {showNew && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="category-slug"
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
      ) : categories.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No categories yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chinese Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  English Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  {editingId === cat.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editZhName}
                          onChange={(e) => setEditZhName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editEnName}
                          onChange={(e) => setEditEnName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={handleUpdate}
                          disabled={saving}
                          className="text-green-600 hover:text-green-800 text-sm mr-3 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-600">{cat.slug}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{cat.zhName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{cat.enName}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-sm">
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deleting === cat.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deleting === cat.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
