"use client";

import { useState, useMemo, useEffect } from "react";
import { FlexPreviewRenderer } from "@/app/admin/line/flex-builder/page";

/* ---------- 型定義 ---------- */

export interface PickerTemplate {
  id: number;
  name: string;
  content?: string;
  message_type?: string;
  flex_content?: Record<string, unknown> | null;
}

interface TemplatePickerProps {
  /** 現在選択中のテンプレートID */
  value: number | string | null | undefined;
  /** テンプレート一覧（親が取得済みのものを渡す） */
  templates: PickerTemplate[];
  /** 選択時コールバック（id, name） */
  onSelect: (id: number, name: string) => void;
  /** テンプレート解除時 */
  onClear?: () => void;
  /** ラベルテキスト */
  label?: string;
  /** プレースホルダ */
  placeholder?: string;
  /** コンパクトモード（行内表示） */
  compact?: boolean;
}

/* ---------- タイプフィルタ ---------- */

type TypeFilter = "all" | "text" | "image" | "flex" | "imagemap";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "text", label: "テキスト" },
  { key: "image", label: "画像" },
  { key: "imagemap", label: "リッチ" },
  { key: "flex", label: "Flex" },
];

function getTypeLabel(type: string | undefined) {
  if (type === "imagemap") return "リッチ";
  if (type === "image") return "画像";
  if (type === "flex") return "Flex";
  return "テキスト";
}

function getTypeColor(type: string | undefined) {
  if (type === "imagemap") return "bg-amber-100 text-amber-600";
  if (type === "image") return "bg-purple-100 text-purple-600";
  if (type === "flex") return "bg-blue-100 text-blue-600";
  return "bg-gray-100 text-gray-500";
}

/* ---------- コンポーネント ---------- */

export function TemplatePicker({
  value,
  templates,
  onSelect,
  onClear,
  label,
  placeholder = "テンプレートを選択",
  compact = false,
}: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [previewId, setPreviewId] = useState<number | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === Number(value)),
    [templates, value],
  );

  const filtered = useMemo(() => {
    let list = templates;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.content || "").toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      list = list.filter(t => t.message_type === typeFilter);
    }
    return list;
  }, [templates, search, typeFilter]);

  const previewTemplate = useMemo(
    () => templates.find(t => t.id === previewId),
    [templates, previewId],
  );

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const handleSelect = (t: PickerTemplate) => {
    onSelect(t.id, t.name);
    setIsOpen(false);
    setSearch("");
    setTypeFilter("all");
  };

  return (
    <>
      {/* トリガーボタン */}
      <div>
        {label && <label className="block text-xs text-gray-500 mb-1">{label}</label>}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full flex items-center gap-2 border rounded-xl transition-colors text-left ${
            compact ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm"
          } ${
            selectedTemplate
              ? "border-[#06C755] bg-green-50/50 hover:bg-green-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          {selectedTemplate ? (
            <>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getTypeColor(selectedTemplate.message_type)}`}>
                {getTypeLabel(selectedTemplate.message_type)}
              </span>
              <span className="text-gray-800 truncate flex-1">{selectedTemplate.name}</span>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-400 flex-1">{placeholder}</span>
            </>
          )}
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">テンプレートを選択</h3>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* 検索 */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="テンプレート名で検索..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                  autoFocus
                />
              </div>
              {/* タイプフィルタ */}
              <div className="flex items-center gap-1.5">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTypeFilter(f.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      typeFilter === f.key
                        ? "bg-[#06C755] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* テンプレートリスト */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">
                    {search.trim() ? "該当するテンプレートがありません" : "テンプレートがありません"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        Number(value) === t.id ? "bg-green-50/50" : ""
                      }`}
                      onClick={() => handleSelect(t)}
                    >
                      {/* サムネイル */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {t.message_type === "image" || t.message_type === "imagemap" ? (
                          <img src={t.content || ""} alt="" className="w-full h-full object-cover" />
                        ) : t.message_type === "flex" && t.flex_content ? (
                          <div className="transform scale-[0.15] origin-center pointer-events-none">
                            <FlexPreviewRenderer data={t.flex_content} />
                          </div>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                          </svg>
                        )}
                      </div>

                      {/* テンプレート情報 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">{t.name}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getTypeColor(t.message_type)}`}>
                            {getTypeLabel(t.message_type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {t.message_type === "image" || t.message_type === "imagemap" ? "(画像)" : (t.content || "").substring(0, 60)}
                        </p>
                      </div>

                      {/* プレビューボタン */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewId(previewId === t.id ? null : t.id); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 flex-shrink-0"
                        title="プレビュー"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* 選択チェック */}
                      {Number(value) === t.id && (
                        <svg className="w-5 h-5 text-[#06C755] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* プレビューパネル */}
            {previewTemplate && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">プレビュー: {previewTemplate.name}</span>
                  <button onClick={() => setPreviewId(null)} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
                </div>
                <div className="bg-[#7494c0] rounded-xl p-4 max-h-[200px] overflow-y-auto flex items-center justify-center">
                  {previewTemplate.message_type === "image" || previewTemplate.message_type === "imagemap" ? (
                    <img src={previewTemplate.content || ""} alt="" className="max-h-[180px] rounded-lg" />
                  ) : previewTemplate.message_type === "flex" && previewTemplate.flex_content ? (
                    <div className="transform scale-[0.6] origin-center pointer-events-none">
                      <FlexPreviewRenderer data={previewTemplate.flex_content} />
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[280px] shadow-sm">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{previewTemplate.content || ""}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
