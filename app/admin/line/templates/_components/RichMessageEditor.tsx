"use client";

import { useState, useRef } from "react";
import type { ImagemapArea, LayoutKey } from "@/lib/line-imagemap";
import { LAYOUT_PRESETS, areasFromLayout, areaLabel, areaColor, areaBorderColor } from "@/lib/line-imagemap";

interface RichMessageEditorProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  areas: ImagemapArea[];
  setAreas: (areas: ImagemapArea[]) => void;
  layout: LayoutKey;
  setLayout: (layout: LayoutKey) => void;
}

export function RichMessageEditor({
  imageUrl,
  setImageUrl,
  areas,
  setAreas,
  layout,
  setLayout,
}: RichMessageEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number>(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/line/upload-template-image", {
        method: "POST", credentials: "include", body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert((data.message || data.error) || "画像アップロード失敗");
        return;
      }
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      alert("画像アップロード中にエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const handleLayoutChange = (key: LayoutKey) => {
    setLayout(key);
    setAreas(areasFromLayout(key));
    setSelectedAreaIndex(0);
  };

  const updateAreaAction = (index: number, field: "type" | "value", val: string) => {
    const next = areas.map((a, i) => {
      if (i !== index) return a;
      return { ...a, action: { ...a.action, [field]: val } };
    });
    setAreas(next);
  };

  const selectedArea = areas[selectedAreaIndex];

  return (
    <div className="space-y-5">
      {/* 画像アップロード */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          画像 <span className="text-red-500 text-xs px-1.5 py-0.5 bg-red-50 rounded">必須</span>
        </label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
        {imageUrl ? (
          <div className="space-y-3">
            {/* プレビュー（タップ領域オーバーレイ付き） */}
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <div className="relative" style={{ paddingBottom: "100%" }}>
                <img
                  src={imageUrl}
                  alt="リッチメッセージ画像"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* エリアオーバーレイ */}
                {areas.map((area, i) => {
                  const pctX = (area.x / 1040) * 100;
                  const pctY = (area.y / 1040) * 100;
                  const pctW = (area.width / 1040) * 100;
                  const pctH = (area.height / 1040) * 100;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedAreaIndex(i)}
                      className="absolute flex items-center justify-center transition-all"
                      style={{
                        left: `${pctX}%`,
                        top: `${pctY}%`,
                        width: `${pctW}%`,
                        height: `${pctH}%`,
                        backgroundColor: areaColor(i),
                        border: `2px ${selectedAreaIndex === i ? "solid" : "dashed"} ${areaBorderColor(i)}`,
                        boxShadow: selectedAreaIndex === i ? `0 0 0 2px ${areaBorderColor(i)}` : "none",
                      }}
                    >
                      <span
                        className="text-white font-bold text-lg drop-shadow-lg rounded-full w-8 h-8 flex items-center justify-center"
                        style={{ backgroundColor: areaBorderColor(i) }}
                      >
                        {areaLabel(i)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                画像を変更
              </button>
              <button
                onClick={() => setImageUrl("")}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                画像を削除
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50/30 transition-all flex flex-col items-center gap-3"
          >
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">アップロード中...</span>
              </>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600">クリックして画像を選択</span>
                  <p className="text-xs text-gray-400 mt-1">正方形（1040×1040px推奨）のJPEG/PNG/WebP</p>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      {/* レイアウト選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">タップ領域レイアウト</label>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handleLayoutChange(preset.key)}
              className={`relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all ${
                layout === preset.key
                  ? "border-[#06C755] bg-green-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* ミニチュアレイアウト図 */}
              <div className="w-10 h-10 relative bg-gray-100 rounded overflow-hidden">
                {preset.areas.map((a, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${(a.x / 1040) * 100}%`,
                      top: `${(a.y / 1040) * 100}%`,
                      width: `${(a.width / 1040) * 100}%`,
                      height: `${(a.height / 1040) * 100}%`,
                      backgroundColor: areaColor(i),
                      border: `1px solid ${areaBorderColor(i)}`,
                    }}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-medium ${layout === preset.key ? "text-[#06C755]" : "text-gray-500"}`}>
                {preset.label}
              </span>
              {layout === preset.key && (
                <div className="absolute -top-px -right-px w-3.5 h-3.5 bg-[#06C755] rounded-bl-lg rounded-tr-[10px] flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* エリア別アクション設定 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          タップ時のアクション設定
        </label>

        {/* エリア切替タブ */}
        <div className="flex items-center gap-1 mb-3">
          {areas.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedAreaIndex(i)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                selectedAreaIndex === i
                  ? "text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              style={selectedAreaIndex === i ? { backgroundColor: areaBorderColor(i) } : {}}
            >
              エリア {areaLabel(i)}
            </button>
          ))}
        </div>

        {/* 選択中エリアの設定 */}
        {selectedArea && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: areaBorderColor(selectedAreaIndex) }}
              >
                {areaLabel(selectedAreaIndex)}
              </span>
              <span className="text-sm font-medium text-gray-700">
                エリア {areaLabel(selectedAreaIndex)} のアクション
              </span>
            </div>

            {/* アクションタイプ */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateAreaAction(selectedAreaIndex, "type", "uri")}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  selectedArea.action.type === "uri"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                </svg>
                URLを開く
              </button>
              <button
                onClick={() => updateAreaAction(selectedAreaIndex, "type", "message")}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  selectedArea.action.type === "message"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                メッセージ送信
              </button>
            </div>

            {/* アクション値 */}
            <input
              type="text"
              value={selectedArea.action.value}
              onChange={(e) => updateAreaAction(selectedAreaIndex, "value", e.target.value)}
              placeholder={selectedArea.action.type === "uri" ? "https://example.com" : "送信するテキストを入力"}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
            />

            {selectedArea.action.type === "uri" && !selectedArea.action.value.startsWith("https://") && selectedArea.action.value.trim() && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                URLは https:// で始まる必要があります
              </p>
            )}
          </div>
        )}

        {/* アクション一覧サマリー */}
        <div className="mt-3 space-y-1">
          {areas.map((area, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                selectedAreaIndex === i ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedAreaIndex(i)}
            >
              <span
                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: areaBorderColor(i) }}
              >
                {areaLabel(i)}
              </span>
              <span className="text-gray-400 flex-shrink-0">
                {area.action.type === "uri" ? "URL" : "MSG"}:
              </span>
              <span className="text-gray-600 truncate">
                {area.action.value || "(未設定)"}
              </span>
              {area.action.value && (
                <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
