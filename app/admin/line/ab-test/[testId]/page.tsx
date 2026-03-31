"use client";

import { useState, useCallback, use } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ========================================
// 型定義
// ========================================

interface Variant {
  id: string;
  ab_test_id: string;
  name: string;
  template_id: string | null;
  message_content: string | null;
  message_type: string;
  flex_json: unknown;
  allocation_ratio: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  created_at: string;
}

interface ABTest {
  id: string;
  name: string;
  status: string;
  target_segment: string | null;
  target_count: number;
  winner_variant_id: string | null;
  winner_criteria: string;
  auto_select_winner: boolean;
  min_sample_size: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  ab_test_variants: Variant[];
}

interface VariantResult {
  id: string;
  name: string;
  allocation_ratio: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

interface WinnerResult {
  winnerId: string | null;
  winnerName: string | null;
  reason: string;
  significant: boolean;
  pValue: number;
  rates: { id: string; name: string; rate: number }[];
}

interface ResultsData {
  test: ABTest;
  variants: VariantResult[];
  stats: WinnerResult | null;
  assignments_count: number;
}

// ========================================
// 定数
// ========================================

const STATUS_MAP: Record<string, { text: string; bg: string; textColor: string; dot: string }> = {
  draft: { text: "下書き", bg: "bg-gray-50", textColor: "text-gray-600", dot: "bg-gray-400" },
  running: { text: "実行中", bg: "bg-emerald-50", textColor: "text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
  completed: { text: "完了", bg: "bg-blue-50", textColor: "text-blue-700", dot: "bg-blue-500" },
  cancelled: { text: "キャンセル", bg: "bg-red-50", textColor: "text-red-600", dot: "bg-red-400" },
};

const CRITERIA_LABELS: Record<string, string> = {
  open_rate: "開封率",
  click_rate: "クリック率",
  conversion_rate: "コンバージョン率",
};

const VARIANT_COLORS = ["#2563EB", "#F43F5E", "#8B5CF6", "#F59E0B", "#10B981"];

// ========================================
// メインコンポーネント
// ========================================

export default function ABTestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = use(params);
  const testKey = `/api/admin/line/ab-test/${testId}`;
  const resultsKey = `/api/admin/line/ab-test/${testId}/results`;

  // テスト詳細取得
  const { data: testData, isLoading } = useSWR<{ test: ABTest; stats: WinnerResult | null }>(testKey);
  const test = testData?.test;
  const variants = test?.ab_test_variants || [];

  // 結果取得（running/completed時のみ）
  const shouldFetchResults = test && (test.status === "running" || test.status === "completed");
  const { data: resultsData } = useSWR<ResultsData>(
    shouldFetchResults ? resultsKey : null,
  );

  // 配信中状態
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // エラー
  const [error, setError] = useState("");

  // バリアント編集状態
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editRatio, setEditRatio] = useState(50);

  // ========================================
  // 配信実行
  // ========================================

  const handleSend = useCallback(async () => {
    if (!confirm("ABテスト配信を実行しますか？\n対象のLINE友だち全員にメッセージが送信されます。")) return;

    setSending(true);
    setSendResult(null);
    setError("");

    try {
      const res = await fetch(`/api/admin/line/ab-test/${testId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({
          ok: true,
          message: `配信完了: ${data.total_sent}件送信（対象: ${data.total_recipients}件）`,
        });
        // テスト詳細と結果を再取得
        await mutate(testKey);
        await mutate(resultsKey);
      } else {
        setSendResult({
          ok: false,
          message: data.message || "配信に失敗しました",
        });
      }
    } catch {
      setSendResult({ ok: false, message: "通信エラーが発生しました" });
    } finally {
      setSending(false);
    }
  }, [testId, testKey, resultsKey]);

  // ========================================
  // ステータス変更
  // ========================================

  const updateStatus = useCallback(async (newStatus: string) => {
    const labels: Record<string, string> = { completed: "完了", cancelled: "キャンセル" };
    if (!confirm(`テストを${labels[newStatus] || newStatus}にしますか？`)) return;

    try {
      const res = await fetch(`/api/admin/line/ab-test/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await mutate(testKey);
        await mutate(resultsKey);
      } else {
        const data = await res.json();
        setError(data.message || "ステータス更新に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
  }, [testId, testKey, resultsKey]);

  // ========================================
  // バリアント追加
  // ========================================

  const addVariant = useCallback(async () => {
    const nextName = String.fromCharCode(65 + variants.length); // A, B, C, ...
    try {
      const res = await fetch(`/api/admin/line/ab-test/${testId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: nextName,
          message_content: "",
          message_type: "text",
          allocation_ratio: Math.floor(100 / (variants.length + 1)),
        }),
      });

      if (res.ok) {
        await mutate(testKey);
      } else {
        const data = await res.json();
        setError(data.message || "バリアント追加に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
  }, [testId, variants.length, testKey]);

  // ========================================
  // バリアント更新
  // ========================================

  const saveVariant = useCallback(async (variantId: string) => {
    try {
      const res = await fetch(`/api/admin/line/ab-test/${testId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: variantId,
          message_content: editContent,
          allocation_ratio: editRatio,
        }),
      });

      if (res.ok) {
        setEditingVariant(null);
        await mutate(testKey);
      } else {
        const data = await res.json();
        setError(data.message || "更新に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
  }, [testId, editContent, editRatio, testKey]);

  // ========================================
  // バリアント削除
  // ========================================

  const deleteVariant = useCallback(async (variantId: string) => {
    if (!confirm("このバリアントを削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/line/ab-test/${testId}/variants?variantId=${variantId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        await mutate(testKey);
      } else {
        const data = await res.json();
        setError(data.message || "削除に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
  }, [testId, testKey]);

  // ========================================
  // ローディング
  // ========================================

  if (isLoading) {
    return (
      <div className="min-h-full bg-gray-50/50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">テストが見つかりません</p>
          <Link href="/admin/line/ab-test" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[test.status] || STATUS_MAP.draft;
  const isDraft = test.status === "draft";
  const isRunningOrCompleted = test.status === "running" || test.status === "completed";

  // 結果データ
  const variantResults = resultsData?.variants || [];
  const stats = resultsData?.stats || testData?.stats;

  // チャートデータ
  const chartData = variantResults.map((v, i) => ({
    name: `パターン${v.name}`,
    openRate: v.open_rate,
    clickRate: v.click_rate,
    cvRate: v.conversion_rate,
    color: VARIANT_COLORS[i % VARIANT_COLORS.length],
  }));

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Link href="/admin/line/ab-test" className="hover:text-blue-600 transition-colors">
              A/Bテスト管理
            </Link>
            <span>/</span>
            <span className="text-gray-600">{test.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{test.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.bg} ${statusInfo.textColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                  {statusInfo.text}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                <span>判定基準: {CRITERIA_LABELS[test.winner_criteria] || test.winner_criteria}</span>
                <span>配信数: {test.target_count.toLocaleString()}</span>
                <span>作成: {new Date(test.created_at).toLocaleDateString("ja-JP")}</span>
                {test.started_at && (
                  <span>開始: {new Date(test.started_at).toLocaleDateString("ja-JP")}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDraft && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      配信中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      配信実行
                    </>
                  )}
                </button>
              )}
              {test.status === "running" && (
                <button
                  onClick={() => updateStatus("completed")}
                  className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  テスト完了
                </button>
              )}
              {(test.status === "draft" || test.status === "running") && (
                <button
                  onClick={() => updateStatus("cancelled")}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 配信結果メッセージ */}
        {sendResult && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
            sendResult.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            <span>{sendResult.message}</span>
            <button onClick={() => setSendResult(null)} className="opacity-50 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* バリアントカード */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">バリアント</h2>
            {isDraft && (
              <button
                onClick={addVariant}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                バリアント追加
              </button>
            )}
          </div>

          {/* 配分バー */}
          {variants.length > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden mb-4 shadow-sm">
              {variants.map((v, i) => (
                <div
                  key={v.id}
                  className="relative group transition-all"
                  style={{
                    width: `${v.allocation_ratio}%`,
                    backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length],
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {v.name}: {v.allocation_ratio}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {variants.map((v, i) => {
              const isEditing = editingVariant === v.id;
              const color = VARIANT_COLORS[i % VARIANT_COLORS.length];

              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* カードヘッダー */}
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {v.name}
                      </div>
                      <span className="text-sm font-bold text-gray-900">パターン{v.name}</span>
                      <span className="text-xs text-gray-400">{v.allocation_ratio}%</span>
                      {v.id === test.winner_variant_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          勝者
                        </span>
                      )}
                    </div>
                    {isDraft && (
                      <div className="flex items-center gap-1">
                        {!isEditing ? (
                          <button
                            onClick={() => {
                              setEditingVariant(v.id);
                              setEditContent(v.message_content || "");
                              setEditRatio(v.allocation_ratio);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingVariant(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                            title="キャンセル"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => deleteVariant(v.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* カード本体 */}
                  <div className="px-5 py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        {/* 配分スライダー */}
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">
                            配分: {editRatio}%
                          </label>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            step={5}
                            value={editRatio}
                            onChange={(e) => setEditRatio(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        {/* メッセージ入力 */}
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">メッセージ</label>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                          />
                          <div className="text-right text-[10px] text-gray-400 mt-1">{editContent.length}文字</div>
                        </div>
                        <button
                          onClick={() => saveVariant(v.id)}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                          {v.message_content || "(メッセージ未設定)"}
                        </p>
                        <div className="text-[10px] text-gray-400 mt-2">
                          タイプ: {v.message_type === "flex" ? "Flex" : "テキスト"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 統計（running/completed時） */}
                  {isRunningOrCompleted && (
                    <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
                      <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                          <div className="text-xs text-gray-400">送信</div>
                          <div className="text-sm font-bold text-gray-900">{v.sent_count.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">開封</div>
                          <div className="text-sm font-bold text-gray-900">{v.open_count.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">クリック</div>
                          <div className="text-sm font-bold text-gray-900">{v.click_count.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">CV</div>
                          <div className="text-sm font-bold text-gray-900">{v.conversion_count.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 結果セクション（running/completed時） */}
        {isRunningOrCompleted && variantResults.length > 0 && (
          <>
            {/* 勝者判定 */}
            {stats && (
              <div className={`rounded-xl p-5 border ${stats.significant ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {stats.significant ? (
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={`text-sm font-bold ${stats.significant ? "text-amber-800" : "text-gray-700"}`}>
                    {stats.significant ? "統計的に有意な差があります" : "統計的有意差なし"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{stats.reason}</p>
                {stats.pValue < 1 && (
                  <p className="text-xs text-gray-400 mt-1">p値: {stats.pValue}</p>
                )}
              </div>
            )}

            {/* 比較テーブル */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900">バリアント比較</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">バリアント</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">配分</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">送信数</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">開封率</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">クリック率</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">CV率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantResults.map((v, i) => {
                      const isWinner = stats?.winnerId === v.id;
                      // 最高CTRのバリアントをハイライト
                      const maxClickRate = Math.max(...variantResults.map((vr) => vr.click_rate));
                      const isBestCtr = v.click_rate === maxClickRate && v.click_rate > 0;

                      return (
                        <tr key={v.id} className={`border-b border-gray-50 ${isWinner ? "bg-amber-50/30" : ""}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
                              >
                                {v.name}
                              </div>
                              <span className="font-medium text-gray-900">パターン{v.name}</span>
                              {isWinner && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">勝者</span>
                              )}
                              {isBestCtr && !isWinner && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">最高CTR</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-gray-600">{v.allocation_ratio}%</td>
                          <td className="text-right py-3 px-4 font-medium text-gray-900">{v.sent_count.toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-bold text-gray-900">{v.open_rate}%</td>
                          <td className="text-right py-3 px-4 font-bold text-gray-900">{v.click_rate}%</td>
                          <td className="text-right py-3 px-4 font-bold text-gray-900">{v.conversion_rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* チャート */}
            {chartData.some((d) => d.openRate > 0 || d.clickRate > 0 || d.cvRate > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50">
                  <h3 className="text-sm font-bold text-gray-900">パフォーマンス比較</h3>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} unit="%" />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: unknown, name: unknown) => {
                          const labels: Record<string, string> = { openRate: "開封率", clickRate: "クリック率", cvRate: "CV率" };
                          return [`${Number(value)}%`, labels[String(name)] || String(name)];
                        }}
                      />
                      <Legend formatter={(value) => {
                        const labels: Record<string, string> = { openRate: "開封率", clickRate: "クリック率", cvRate: "CV率" };
                        return labels[value] || value;
                      }} />
                      <Bar dataKey="openRate" name="openRate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={`open-${idx}`} fill={entry.color} opacity={0.9} />
                        ))}
                      </Bar>
                      <Bar dataKey="clickRate" name="clickRate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={`click-${idx}`} fill={entry.color} opacity={0.6} />
                        ))}
                      </Bar>
                      <Bar dataKey="cvRate" name="cvRate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={`cv-${idx}`} fill={entry.color} opacity={0.35} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
