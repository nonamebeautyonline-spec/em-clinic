"use client";

import { useState, useMemo } from "react";

type KarteImage = {
  id: number;
  patient_id: string;
  image_url: string;
  label: string;
  category: string;
  created_at: string;
};

type Props = {
  images: KarteImage[];
};

/** ビフォーアフター比較コンポーネント（2枚の画像を左右並置） */
export function BeforeAfterCompare({ images }: Props) {
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // 日付が古い順にソート
  const sorted = useMemo(
    () => [...images].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [images],
  );

  if (images.length < 2) return null;

  const beforeImg = sorted.find((i) => i.id === beforeId);
  const afterImg = sorted.find((i) => i.id === afterId);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[11px] px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
      >
        ビフォーアフター比較
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* 画像選択 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-blue-600 mb-1">Before（施術前）</div>
              <select
                value={beforeId ?? ""}
                onChange={(e) => setBeforeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg"
              >
                <option value="">選択してください</option>
                {sorted.map((img) => (
                  <option key={img.id} value={img.id} disabled={img.id === afterId}>
                    {img.label || "ラベルなし"} - {formatDate(img.created_at)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-rose-600 mb-1">After（施術後）</div>
              <select
                value={afterId ?? ""}
                onChange={(e) => setAfterId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg"
              >
                <option value="">選択してください</option>
                {sorted.map((img) => (
                  <option key={img.id} value={img.id} disabled={img.id === beforeId}>
                    {img.label || "ラベルなし"} - {formatDate(img.created_at)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 比較表示 */}
          {beforeImg && afterImg && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="rounded-lg overflow-hidden border-2 border-blue-200 bg-slate-50">
                  <img
                    src={beforeImg.image_url}
                    alt={beforeImg.label || "Before"}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-blue-600">Before</div>
                  <div className="text-[9px] text-slate-400">
                    {beforeImg.label} / {formatDate(beforeImg.created_at)}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="rounded-lg overflow-hidden border-2 border-rose-200 bg-slate-50">
                  <img
                    src={afterImg.image_url}
                    alt={afterImg.label || "After"}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-rose-600">After</div>
                  <div className="text-[9px] text-slate-400">
                    {afterImg.label} / {formatDate(afterImg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
