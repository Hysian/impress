import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import { uploadMedia } from "@/api/media";
import type { MediaItem } from "@/api/media";

interface ImageCropUploadProps {
  onUpload: (item: MediaItem) => void;
  aspectRatio?: number;
  currentImageUrl?: string;
}

export default function ImageCropUpload({
  onUpload,
  aspectRatio = 16 / 9,
  currentImageUrl,
}: ImageCropUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const item = await uploadMedia(croppedBlob, `cropped-${Date.now()}.jpg`);
      onUpload(item);
      setShowCropper(false);
      setImageSrc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleDirectUpload = async () => {
    if (!imageSrc) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const item = await uploadMedia(blob, `upload-${Date.now()}.jpg`);
      onUpload(item);
      setShowCropper(false);
      setImageSrc(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCropper(false);
    setImageSrc(null);
    setError(null);
  };

  return (
    <div>
      {/* Current image preview */}
      {currentImageUrl && !showCropper && (
        <div className="mb-3">
          <img
            src={currentImageUrl}
            alt=""
            className="max-h-24 rounded border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* File input */}
      {!showCropper && (
        <label className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
          选择图片
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Crop modal */}
      {showCropper && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-[90vw] max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">裁剪图片</h3>
            </div>

            <div className="relative h-96 bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-6 py-3">
              <label className="flex items-center gap-3 text-sm text-gray-600">
                <span>缩放</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </label>
            </div>

            {error && (
              <div className="px-6 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDirectUpload}
                disabled={uploading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? "上传中..." : "不裁剪直接上传"}
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "上传中..." : "裁剪并上传"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
