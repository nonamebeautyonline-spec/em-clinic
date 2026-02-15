"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type KarteImage = {
  id: number;
  patient_id: string;
  intake_id: number | null;
  reserve_id: string | null;
  image_url: string;
  label: string;
  category: string;
  memo: string;
  taken_at: string | null;
  created_at: string;
};

type Props = {
  patientId: string;
  reserveId?: string;
  intakeId?: string;
  // 読み取り専用モード（検索画面等）
  readOnly?: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "before_after", label: "施術前後" },
  { value: "progress", label: "経過写真" },
  { value: "exam", label: "検査結果" },
  { value: "other", label: "その他" },
];

const LABEL_PRESETS = [
  "施術前",
  "施術後",
  "経過1週間",
  "経過1ヶ月",
  "経過3ヶ月",
  "正面",
  "側面（左）",
  "側面（右）",
];

export default function KarteImageSection({
  patientId,
  reserveId,
  intakeId,
  readOnly = false,
}: Props) {
  const [images, setImages] = useState<KarteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<KarteImage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<KarteImage | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCategory, setUploadCategory] = useState("progress");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (patientId) params.set("patient_id", patientId);

      const res = await fetch(`/api/doctor/karte-images?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) setImages(data.images || []);
    } catch (e) {
      console.error("画像取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) fetchImages();
  }, [patientId, fetchImages]);

  const handleUpload = async (files: File[]) => {
    if (!patientId || uploading) return;
    setUploading(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", patientId);
      if (reserveId) formData.append("reserve_id", reserveId);
      if (intakeId) formData.append("intake_id", intakeId);
      formData.append("label", uploadLabel);
      formData.append("category", uploadCategory);

      try {
        const res = await fetch("/api/doctor/karte-images", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = await res.json();
        if (!data.ok) {
          alert(`${file.name}: ${data.error || "アップロード失敗"}`);
        }
      } catch (e) {
        console.error("アップロードエラー:", e);
        alert(`${file.name}: アップロードに失敗しました`);
      }
    }

    setUploading(false);
    setUploadLabel("");
    await fetchImages();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) handleUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleUpload(files);
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(
        `/api/doctor/karte-images?id=${deleteConfirm.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.ok) {
        setImages((prev) => prev.filter((img) => img.id !== deleteConfirm.id));
      } else {
        alert("削除に失敗しました");
      }
    } catch (e) {
      console.error("削除エラー:", e);
      alert("削除に失敗しました");
    }
    setDeleteConfirm(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const m = date.getMonth() + 1;
    const day = date.getDate();
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${m}/${day} ${h}:${min}`;
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORY_OPTIONS.find((o) => o.value === cat)?.label || cat;

  // 画像をカテゴリ別にグルーピング
  const groupedImages = images.reduce(
    (acc, img) => {
      const cat = img.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(img);
      return acc;
    },
    {} as Record<string, KarteImage[]>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-500">
          経過写真・画像（{images.length}枚）
        </div>
      </div>

      {/* アップロードエリア（非読み取り専用時のみ） */}
      {!readOnly && (
        <div className="space-y-2">
          {/* ラベル・カテゴリ選択 */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="text-[11px] px-2 py-1 border border-slate-300 rounded-lg"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[120px]">
              <input
                type="text"
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                onFocus={() => setShowLabelPicker(true)}
                onBlur={() => setTimeout(() => setShowLabelPicker(false), 200)}
                placeholder="ラベル（例：施術前）"
                className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded-lg"
              />
              {showLabelPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-1 min-w-[160px]">
                  {LABEL_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setUploadLabel(preset);
                        setShowLabelPicker(false);
                      }}
                      className="block w-full text-left px-2 py-1 text-[11px] rounded hover:bg-slate-50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ドラッグ&ドロップ */}
          <div
            className={`border-2 border-dashed rounded-xl py-4 flex flex-col items-center justify-center transition-colors cursor-pointer ${
              dragOver
                ? "border-pink-400 bg-pink-50/50"
                : "border-slate-200 hover:border-pink-300 hover:bg-pink-50/20"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-500">
                  アップロード中...
                </span>
              </div>
            ) : (
              <>
                <svg
                  className="w-6 h-6 text-slate-300 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-[11px] text-slate-500">
                  写真をドロップ または タップして選択
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPEG, PNG, WebP, HEIC（10MBまで）
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              multiple
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {/* 画像一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
          <span className="text-[11px] text-slate-400 ml-2">読み込み中...</span>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[11px] text-slate-400">
            まだ画像がありません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedImages).map(([cat, imgs]) => (
            <div key={cat}>
              <div className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                {getCategoryLabel(cat)}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {imgs.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <div
                      className="aspect-square cursor-pointer"
                      onClick={() => setPreviewImage(img)}
                    >
                      <img
                        src={img.image_url}
                        alt={img.label || "カルテ画像"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* ラベル・日時オーバーレイ */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                      {img.label && (
                        <div className="text-[9px] text-white font-medium truncate">
                          {img.label}
                        </div>
                      )}
                      <div className="text-[8px] text-white/70">
                        {formatDate(img.created_at)}
                      </div>
                    </div>
                    {/* 削除ボタン */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(img);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* プレビューモーダル */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {previewImage.label || "カルテ画像"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {getCategoryLabel(previewImage.category)} /{" "}
                  {formatDate(previewImage.created_at)}
                </div>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
              <img
                src={previewImage.image_url}
                alt={previewImage.label || "カルテ画像"}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            {previewImage.memo && (
              <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-600">
                {previewImage.memo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              画像を削除しますか？
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">
              {deleteConfirm.label || "この画像"}
              を削除します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-full bg-rose-500 text-[11px] text-white"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
