import { useState, useEffect, useCallback } from "react";
import { listMedia, deleteMedia, uploadMedia } from "@/api/media";
import type { MediaItem } from "@/api/media";
import ImageCropUpload from "@/components/admin/ImageCropUpload";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const pageSize = 20;

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMedia(page, pageSize);
      setItems(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载图片列表失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`确定要删除 ${item.filename} 吗？`)) return;

    setDeleting(item.id);
    setError(null);
    try {
      await deleteMedia(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {
      // Fallback: select text in a temporary input
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    });
  };

  const handleUpload = () => {
    setShowUpload(false);
    loadMedia();
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      await uploadMedia(file);
      loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
    e.target.value = "";
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">媒体管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 个文件</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
            直接上传
            <input
              type="file"
              accept="image/*"
              onChange={handleDirectUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            裁剪上传
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {showUpload && (
        <div className="mb-6 p-6 bg-white shadow rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">裁剪上传</h2>
          <ImageCropUpload onUpload={handleUpload} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">加载中...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">暂无图片，点击上传按钮添加</p>
        </div>
      ) : (
        <>
          {/* Image grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-700 truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(item.size)}
                    {item.width && item.height && ` · ${item.width}×${item.height}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(item.url)}
                    className="px-3 py-1.5 text-xs bg-white text-gray-800 rounded-md hover:bg-gray-100"
                  >
                    复制 URL
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deleting === item.id}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
