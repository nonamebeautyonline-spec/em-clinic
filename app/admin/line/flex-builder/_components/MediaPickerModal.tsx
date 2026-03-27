"use client";

import { useState, useEffect } from "react";

interface MediaFile {
  id: number;
  name: string;
  file_url: string;
  file_type: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

/** メディアライブラリから画像を選択するモーダル */
export function MediaPickerModal({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/line/media?file_type=image", { credentials: "include" });
        const data = await res.json();
        let images: MediaFile[] = data.files || [];
        // image以外も含む場合はフィルタ
        if (images.length === 0) {
          const resAll = await fetch("/api/admin/line/media", { credentials: "include" });
          const allData = await resAll.json();
          images = (allData.files || []).filter(
            (f: MediaFile) => f.file_type === "image" || f.file_type === "menu_image",
          );
        }
        setFiles(images);
      } catch {
        // 取得失敗時は空配列のまま
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search
    ? files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">メディアから画像を選択</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              アップロード済みの画像をFlexメッセージに挿入
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索 */}
        <div className="px-6 py-3 border-b border-gray-50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ファイル名で検索..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* 画像グリッド */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {search ? "該当する画像がありません" : "画像がありません"}
              </p>
              <p className="text-xs text-gray-400 mt-1">メディア管理から先に画像をアップロードしてください</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelect(file.file_url)}
                  className="relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all group"
                >
                  <div className="aspect-video bg-gray-50">
                    <img
                      src={file.file_url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 py-1.5 bg-white">
                    <p className="text-[11px] text-gray-600 truncate">{file.name}</p>
                  </div>
                  {/* ホバーオーバーレイ */}
                  <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
