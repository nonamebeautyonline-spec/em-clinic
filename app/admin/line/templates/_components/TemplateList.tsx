"use client";

import { useState, useMemo } from "react";
import type { Template, TestAccount } from "./template-types";
import { formatDate } from "./template-types";
import { FlexPreviewRenderer } from "@/app/admin/line/flex-builder/page";

/* ---------- 検索・フィルタ・ソート ---------- */

type SortKey = "name" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
type TypeFilter = "all" | "text" | "image" | "flex" | "imagemap";

interface TemplateListProps {
  templates: Template[];
  testAccounts: TestAccount[];
  testSendingId: number | null;
  testSendResult: { id: number; ok: boolean; message: string } | null;
  onEdit: (t: Template) => void;
  onDuplicate: (t: Template) => void;
  onDelete: (id: number) => void;
  onPreview: (t: Template) => void;
  onTestSend: (t: Template) => void;
  onRename: (t: Template) => void;
}

export function TemplateList({
  templates,
  testAccounts,
  testSendingId,
  testSendResult,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  onTestSend,
  onRename,
}: TemplateListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = templates;
    // 検索
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
    }
    // タイプフィルタ
    if (typeFilter !== "all") {
      list = list.filter(t => t.message_type === typeFilter);
    }
    // ソート
    list = [...list].sort((a, b) => {
      if (sortKey === "name") {
        return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const aDate = new Date(a[sortKey]).getTime();
      const bDate = new Date(b[sortKey]).getTime();
      return sortDir === "asc" ? aDate - bDate : bDate - aDate;
    });
    return list;
  }, [templates, search, typeFilter, sortKey, sortDir]);

  const getTypeLabel = (t: Template) => {
    if (t.message_type === "imagemap") return "リッチ";
    if (t.message_type === "image") return "画像";
    if (t.message_type === "flex") return "Flex";
    return "テキスト";
  };

  const getTypeColor = (t: Template) => {
    if (t.message_type === "imagemap") return "bg-amber-100 text-amber-600";
    if (t.message_type === "image") return "bg-purple-100 text-purple-600";
    if (t.message_type === "flex") return "bg-blue-100 text-blue-600";
    return "bg-gray-100 text-gray-500";
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-700 mb-1">テンプレートがありません</h3>
        <p className="text-sm text-gray-400">「新しいテンプレート」ボタンから最初のテンプレートを作成しましょう</p>
        <p className="text-xs text-gray-300 mt-3">テキスト・画像・カルーセル・Flexメッセージに対応しています</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルタ・ソートバー */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 検索 */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="テンプレート名で検索..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
            />
          </div>

          {/* タイプフィルタ */}
          <div className="flex items-center gap-1.5">
            {([
              { key: "all" as TypeFilter, label: "すべて" },
              { key: "text" as TypeFilter, label: "テキスト" },
              { key: "image" as TypeFilter, label: "画像" },
              { key: "imagemap" as TypeFilter, label: "リッチ" },
              { key: "flex" as TypeFilter, label: "Flex" },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  typeFilter === f.key
                    ? "bg-[#06C755] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ソート */}
          <select
            value={`${sortKey}-${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split("-") as [SortKey, SortDir];
              setSortKey(k);
              setSortDir(d);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none text-gray-600"
          >
            <option value="updated_at-desc">更新日（新しい順）</option>
            <option value="updated_at-asc">更新日（古い順）</option>
            <option value="created_at-desc">作成日（新しい順）</option>
            <option value="created_at-asc">作成日（古い順）</option>
            <option value="name-asc">名前（A→Z）</option>
            <option value="name-desc">名前（Z→A）</option>
          </select>
        </div>
        {search.trim() && (
          <p className="text-xs text-gray-400 mt-2">{filtered.length}件見つかりました</p>
        )}
      </div>

      {/* カードグリッド */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-400">検索条件に一致するテンプレートがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group overflow-hidden"
            >
              {/* サムネイルプレビュー */}
              <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden relative">
                {t.message_type === "imagemap" ? (
                  <div className="relative w-full h-full">
                    <img src={t.content} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end justify-center pb-2">
                      <span className="text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full">
                        タップ領域あり
                      </span>
                    </div>
                  </div>
                ) : t.message_type === "image" ? (
                  <img src={t.content} alt="" className="w-full h-full object-cover" />
                ) : t.message_type === "flex" && t.flex_content ? (
                  <div className="transform scale-[0.45] origin-center pointer-events-none">
                    <FlexPreviewRenderer data={t.flex_content} />
                  </div>
                ) : (
                  <div className="px-4 py-2 max-w-full">
                    <p className="text-xs text-gray-400 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                      {t.content.substring(0, 150)}
                    </p>
                  </div>
                )}
                {/* タイプバッジ */}
                <span className={`absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getTypeColor(t)}`}>
                  {getTypeLabel(t)}
                </span>
              </div>

              {/* カード本体 */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors text-left truncate block w-full"
                      title={t.name}
                    >
                      {t.name}
                    </button>
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.category && t.category !== "未分類" && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {t.category}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300">{formatDate(t.updated_at || t.created_at)}</span>
                    </div>
                  </div>

                  {/* アクションメニュー */}
                  <div className="relative flex-shrink-0">
                    {testSendResult?.id === t.id ? (
                      <span
                        className={`text-[11px] font-medium ${testSendResult.ok ? "text-emerald-600" : "text-red-500"}`}
                        title={testSendResult.message}
                      >
                        {testSendResult.ok ? "送信完了" : "失敗"}
                      </span>
                    ) : testSendingId === t.id ? (
                      <span className="text-[11px] text-amber-600">送信中...</span>
                    ) : (
                      <>
                        <button
                          onClick={() => setActionMenuId(actionMenuId === t.id ? null : t.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                        {actionMenuId === t.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-[160px] py-1">
                              <button
                                onClick={() => { setActionMenuId(null); onPreview(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                プレビュー
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); onEdit(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                編集
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); onDuplicate(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                コピー
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); onRename(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                名前を変更
                              </button>
                              {testAccounts.length > 0 && (
                                <button
                                  onClick={() => { setActionMenuId(null); onTestSend(t); }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                  テスト送信
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => { setActionMenuId(null); onDelete(t.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                削除
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
