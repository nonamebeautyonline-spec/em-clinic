"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";

// --- 型定義 ---
interface Draft {
  id: number;
  patient_id: string | null;
  original_message: string | null;
  draft_reply: string | null;
  reject_category: string | null;
  reject_reason: string | null;
  modified_reply: string | null;
  model_used: string | null;
  ai_category: string | null;
  created_at: string;
  rejected_at: string | null;
  sent_at: string | null;
  review_note: string | null;
  status: string;
}

interface ReviewData {
  drafts: Draft[];
  total: number;
  page: number;
  limit: number;
}

// --- 定数 ---

// 却下理由カテゴリ
const REJECT_CATEGORIES: Record<string, string> = {
  wrong_info: "誤情報",
  inappropriate: "不適切",
  not_answering: "回答不十分",
  insufficient_info: "情報不足",
  other: "その他",
};

// AIカテゴリ
const AI_CATEGORIES: Record<string, string> = {
  operational: "運用系",
  medical: "医療系",
  greeting: "挨拶",
  other: "その他",
};

// ステータスバッジスタイル
const STATUS_STYLES: Record<string, string> = {
  rejected: "bg-red-100 text-red-700",
  sent: "bg-emerald-100 text-emerald-700",
};

// ステータスラベル
const STATUS_LABELS: Record<string, string> = {
  rejected: "却下",
  sent: "送信済",
};

// AIカテゴリバッジスタイル
const CATEGORY_STYLES: Record<string, string> = {
  operational: "bg-purple-100 text-purple-700",
  medical: "bg-red-100 text-red-700",
  greeting: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-600",
};

// --- ヘルパー ---

// 日時フォーマット（M/D HH:mm）
function fmtDateTime(s: string) {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// テキスト省略
function truncate(s: string | null, max: number): string {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// モデル名からバッジスタイルを判定
function modelBadgeStyle(model: string | null): string {
  if (!model) return "bg-gray-100 text-gray-600";
  if (model.includes("haiku")) return "bg-emerald-100 text-emerald-700";
  if (model.includes("sonnet")) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

// モデル名を短縮表示
function shortModelName(model: string | null): string {
  if (!model) return "—";
  if (model.includes("haiku")) return "Haiku";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("opus")) return "Opus";
  return model;
}

// fetcher
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

// --- 自動リサイズ textarea ---
function AutoResizeTextarea({
  defaultValue,
  onSave,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // 高さ自動調整
  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <textarea
      ref={ref}
      defaultValue={defaultValue}
      onInput={adjustHeight}
      onBlur={(e) => onSave(e.currentTarget.value)}
      className="w-full min-h-[2rem] text-xs border border-gray-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
      placeholder="改善メモを入力..."
    />
  );
}

// --- メインコンポーネント ---
export default function AIReplyReviewPage() {
  const [rejectCategory, setRejectCategory] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [period, setPeriod] = useState(30);
  const [page, setPage] = useState(1);

  // フィルタ変更時はページを1に戻す
  const resetPage = () => setPage(1);

  // URLパラメータ構築
  const params = new URLSearchParams();
  params.set("period", String(period));
  params.set("page", String(page));
  if (rejectCategory) params.set("reject_category", rejectCategory);
  if (aiCategory) params.set("ai_category", aiCategory);

  const { data, isLoading, mutate } = useSWR<ReviewData>(
    `/api/admin/line/ai-reply-review?${params.toString()}`,
    fetcher
  );

  // 改善メモ保存
  const saveReviewNote = async (draftId: number, note: string) => {
    await fetch("/api/admin/line/ai-reply-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ draft_id: draftId, review_note: note }),
    });
    // ローカル更新（再fetchせずUIに即反映）
    mutate();
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      {/* タイトル */}
      <h1 className="text-xl font-bold text-gray-800">AI返信レビュー</h1>

      {/* フィルタバー */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 却下理由カテゴリ */}
        <select
          value={rejectCategory}
          onChange={(e) => {
            setRejectCategory(e.target.value);
            resetPage();
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <option value="">却下理由: 全て</option>
          {Object.entries(REJECT_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {/* AIカテゴリ */}
        <select
          value={aiCategory}
          onChange={(e) => {
            setAiCategory(e.target.value);
            resetPage();
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <option value="">カテゴリ: 全て</option>
          {Object.entries(AI_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {/* 期間 */}
        <select
          value={period}
          onChange={(e) => {
            setPeriod(Number(e.target.value));
            resetPage();
          }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <option value={7}>7日間</option>
          <option value={30}>30日間</option>
          <option value={90}>90日間</option>
        </select>
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">読み込み中...</span>
          </div>
        </div>
      )}

      {/* データなし */}
      {!isLoading && data && data.drafts.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400">
            対象のドラフトはありません
          </p>
        </div>
      )}

      {/* テーブル */}
      {!isLoading && data && data.drafts.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">
                    日時
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">
                    ステータス
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">
                    カテゴリ
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                    元メッセージ
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                    AI返信案
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                    却下理由
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                    修正後
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap">
                    モデル
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 min-w-[180px]">
                    改善メモ
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.drafts.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    {/* 日時 */}
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {fmtDateTime(d.created_at)}
                    </td>

                    {/* ステータスバッジ */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[d.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </td>

                    {/* カテゴリバッジ */}
                    <td className="px-3 py-2">
                      {d.ai_category && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_STYLES[d.ai_category] || "bg-gray-100 text-gray-600"}`}
                        >
                          {AI_CATEGORIES[d.ai_category] || d.ai_category}
                        </span>
                      )}
                    </td>

                    {/* 元メッセージ */}
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <span title={d.original_message || ""}>
                        {truncate(d.original_message, 80)}
                      </span>
                    </td>

                    {/* AI返信案 */}
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <span title={d.draft_reply || ""}>
                        {truncate(d.draft_reply, 80)}
                      </span>
                    </td>

                    {/* 却下理由 */}
                    <td className="px-3 py-2 text-gray-600 max-w-[160px]">
                      {d.reject_category && (
                        <span className="block text-[10px] font-medium text-red-600 mb-0.5">
                          {REJECT_CATEGORIES[d.reject_category] ||
                            d.reject_category}
                        </span>
                      )}
                      <span title={d.reject_reason || ""}>
                        {truncate(d.reject_reason, 60)}
                      </span>
                    </td>

                    {/* 修正後 */}
                    <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                      <span title={d.modified_reply || ""}>
                        {truncate(d.modified_reply, 80)}
                      </span>
                    </td>

                    {/* モデルバッジ */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${modelBadgeStyle(d.model_used)}`}
                      >
                        {shortModelName(d.model_used)}
                      </span>
                    </td>

                    {/* 改善メモ（inline textarea） */}
                    <td className="px-3 py-2 min-w-[180px]">
                      <AutoResizeTextarea
                        key={d.id}
                        defaultValue={d.review_note || ""}
                        onSave={(note) => saveReviewNote(d.id, note)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500">
              全{data.total}件中 {(page - 1) * data.limit + 1}〜
              {Math.min(page * data.limit, data.total)}件
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="text-xs text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
