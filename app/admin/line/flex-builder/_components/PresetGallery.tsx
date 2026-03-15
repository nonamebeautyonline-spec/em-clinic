"use client";

import { useState, useMemo } from "react";
import type { FlexPreset } from "../page";
import { FlexPreviewRenderer } from "../page";

/** カテゴリ定義 */
const CATEGORIES = [
  { key: "all", label: "すべて" },
  { key: "reservation", label: "予約" },
  { key: "follow_up", label: "フォロー" },
  { key: "campaign", label: "キャンペーン" },
  { key: "info", label: "お知らせ" },
  { key: "payment", label: "決済" },
  { key: "reminder", label: "リマインダー" },
  { key: "qa", label: "Q&A" },
  { key: "general", label: "汎用" },
] as const;

/** カテゴリ別アイコン */
const CATEGORY_ICONS: Record<string, string> = {
  reservation: "📅",
  follow_up: "💬",
  campaign: "🎉",
  info: "📢",
  payment: "💳",
  reminder: "⏰",
  qa: "❓",
  general: "📋",
};

/** カテゴリ別カラー */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  reservation: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  follow_up: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  campaign: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  info: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  payment: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  reminder: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  qa: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  general: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

interface Props {
  presets: FlexPreset[];
  onSelect: (preset: FlexPreset) => void;
  onClose: () => void;
}

export function PresetGallery({ presets, onSelect, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = presets;
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [presets, selectedCategory, searchQuery]);

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.key === cat)?.label || cat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">テンプレートギャラリー</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              クリニック向けテンプレートから選んで、すぐに編集を始められます
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索 + カテゴリフィルタ */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 space-y-3">
          {/* 検索バー */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="テンプレートを検索..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
            />
          </div>

          {/* カテゴリタブ */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const count =
                cat.key === "all"
                  ? presets.length
                  : presets.filter((p) => p.category === cat.key).length;
              if (cat.key !== "all" && count === 0) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.key !== "all" && CATEGORY_ICONS[cat.key] && (
                    <span className="mr-1">{CATEGORY_ICONS[cat.key]}</span>
                  )}
                  {cat.label}
                  <span className={`ml-1 ${isActive ? "text-white/70" : "text-gray-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* カードグリッド */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">該当するテンプレートがありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((preset) => {
                const catColor = CATEGORY_COLORS[preset.category] || CATEGORY_COLORS.general;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelect(preset)}
                    className="group text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-green-400 hover:shadow-lg transition-all duration-200 flex flex-col"
                  >
                    {/* サムネイルプレビュー */}
                    <div className="bg-[#7494c0] p-3 flex-shrink-0 relative overflow-hidden" style={{ minHeight: "140px" }}>
                      <div className="transform scale-[0.45] origin-top-left" style={{ width: "220%", pointerEvents: "none" }}>
                        <FlexPreviewRenderer data={preset.flex_json} />
                      </div>
                      {/* ホバーオーバーレイ */}
                      <div className="absolute inset-0 bg-green-600/0 group-hover:bg-green-600/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-green-700 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                          このテンプレートを使う
                        </span>
                      </div>
                    </div>

                    {/* 情報 */}
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">
                          {preset.name}
                        </h3>
                      </div>
                      {preset.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">
                          {preset.description}
                        </p>
                      )}
                      <div className="mt-auto">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${catColor.bg} ${catColor.text} border ${catColor.border}`}
                        >
                          {CATEGORY_ICONS[preset.category] && (
                            <span className="mr-0.5">{CATEGORY_ICONS[preset.category]}</span>
                          )}
                          {categoryLabel(preset.category)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50">
          <span className="text-xs text-gray-400">
            {filtered.length} / {presets.length} テンプレート
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
