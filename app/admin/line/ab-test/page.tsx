"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Template {
  id: string;
  name: string;
  content: string;
  message_type: string;
}

interface Variant {
  id: string;
  ab_test_id: string;
  name: string;
  template_id: string | null;
  message_content: string | null;
  message_type: string;
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

interface WinnerResult {
  winnerId: string | null;
  winnerName: string | null;
  reason: string;
  significant: boolean;
  pValue: number;
  rates: { id: string; name: string; rate: number }[];
}

// ========================================
// ステータス定義
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

const VARIANT_COLORS = ["#3B82F6", "#F43F5E", "#8B5CF6", "#F59E0B"];

// ========================================
// メインコンポーネント
// ========================================

export default function ABTestPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // モーダル状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailTest, setDetailTest] = useState<ABTest | null>(null);
  const [detailStats, setDetailStats] = useState<WinnerResult | null>(null);

  // ========================================
  // データ取得
  // ========================================

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/line/ab-test", { credentials: "include" });
      const data = await res.json();
      if (data.tests) setTests(data.tests);
    } catch {
      // エラー時は空配列のまま
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
    // テンプレート取得
    fetch("/api/admin/line/templates", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates);
      })
      .catch(() => {});
  }, [fetchTests]);

  // ========================================
  // テスト詳細取得
  // ========================================

  const openDetail = async (test: ABTest) => {
    try {
      const res = await fetch(`/api/admin/line/ab-test/${test.id}`, { credentials: "include" });
      const data = await res.json();
      setDetailTest(data.test || test);
      setDetailStats(data.stats || null);
    } catch {
      setDetailTest(test);
      setDetailStats(null);
    }
  };

  // ========================================
  // ステータス更新
  // ========================================

  const updateStatus = async (testId: string, newStatus: string) => {
    const labels: Record<string, string> = { running: "開始", completed: "完了", cancelled: "キャンセル" };
    if (!confirm(`テストを${labels[newStatus] || newStatus}にしますか？`)) return;

    const res = await fetch(`/api/admin/line/ab-test/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await fetchTests();
      // 詳細画面が開いていたら更新
      if (detailTest?.id === testId) {
        const data = await res.json();
        if (data.test) {
          setDetailTest(data.test);
        }
        // 再取得
        await openDetail({ ...detailTest!, status: newStatus });
      }
    }
  };

  // ========================================
  // テスト削除
  // ========================================

  const deleteTest = async (testId: string) => {
    if (!confirm("このABテストを削除しますか？")) return;
    const res = await fetch(`/api/admin/line/ab-test/${testId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchTests();
      if (detailTest?.id === testId) {
        setDetailTest(null);
        setDetailStats(null);
      }
    }
  };

  // ========================================
  // レンダリング
  // ========================================

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              A/Bテスト管理
            </h1>
            <p className="text-sm text-gray-400 mt-1">メッセージのバリエーションをテストし、効果を比較</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規テスト
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* ローディング */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {/* テスト一覧 */}
        {!loading && tests.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">ABテストがまだありません</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              最初のテストを作成
            </button>
          </div>
        )}

        {!loading && tests.length > 0 && (
          <div className="space-y-3">
            {tests.map((test) => {
              const statusInfo = STATUS_MAP[test.status] || STATUS_MAP.draft;
              const variants = test.ab_test_variants || [];
              const winnerVariant = variants.find((v) => v.id === test.winner_variant_id);

              return (
                <div
                  key={test.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetail(test)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{test.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.bg} ${statusInfo.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.text}
                        </span>
                        {winnerVariant && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            勝者: {winnerVariant.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>バリアント: {variants.length}個</span>
                        <span>判定基準: {CRITERIA_LABELS[test.winner_criteria] || test.winner_criteria}</span>
                        <span>作成: {new Date(test.created_at).toLocaleDateString("ja-JP")}</span>
                        {test.started_at && (
                          <span>開始: {new Date(test.started_at).toLocaleDateString("ja-JP")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {test.status === "draft" && (
                        <button
                          onClick={() => updateStatus(test.id, "running")}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          開始
                        </button>
                      )}
                      {test.status === "running" && (
                        <button
                          onClick={() => updateStatus(test.id, "completed")}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          完了
                        </button>
                      )}
                      {(test.status === "draft" || test.status === "running") && (
                        <button
                          onClick={() => updateStatus(test.id, "cancelled")}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          取消
                        </button>
                      )}
                      {test.status !== "running" && (
                        <button
                          onClick={() => deleteTest(test.id)}
                          className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* バリアント配分バー */}
                  {variants.length > 0 && (
                    <div className="mt-3 flex h-2 rounded-full overflow-hidden">
                      {variants.map((v, i) => (
                        <div
                          key={v.id}
                          className="transition-all"
                          style={{
                            width: `${v.allocation_ratio}%`,
                            backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length],
                            opacity: 0.7,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <CreateModal
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTests();
          }}
        />
      )}

      {/* 詳細モーダル */}
      {detailTest && (
        <DetailModal
          test={detailTest}
          stats={detailStats}
          onClose={() => {
            setDetailTest(null);
            setDetailStats(null);
          }}
          onStatusChange={(newStatus) => updateStatus(detailTest.id, newStatus)}
        />
      )}
    </div>
  );
}

// ========================================
// 新規作成モーダル
// ========================================

function CreateModal({
  templates,
  onClose,
  onCreated,
}: {
  templates: Template[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("open_rate");
  const [autoSelect, setAutoSelect] = useState(true);
  const [minSample, setMinSample] = useState(100);
  const [variantA, setVariantA] = useState({ templateId: "", content: "", type: "text", ratio: 50 });
  const [variantB, setVariantB] = useState({ templateId: "", content: "", type: "text", ratio: 50 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // テンプレート選択時にコンテンツを反映
  const handleTemplateSelect = (
    templateId: string,
    setter: typeof setVariantA,
  ) => {
    const tpl = templates.find((t) => t.id === templateId);
    setter((prev) => ({
      ...prev,
      templateId,
      content: tpl?.content || prev.content,
      type: tpl?.message_type || "text",
    }));
  };

  // 比率同期
  const handleRatioChange = (value: number) => {
    setVariantA((prev) => ({ ...prev, ratio: value }));
    setVariantB((prev) => ({ ...prev, ratio: 100 - value }));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("テスト名を入力してください");
      return;
    }
    if (!variantA.content.trim() && !variantA.templateId) {
      setError("バリアントAのメッセージを入力してください");
      return;
    }
    if (!variantB.content.trim() && !variantB.templateId) {
      setError("バリアントBのメッセージを入力してください");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/line/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          winner_criteria: criteria,
          auto_select_winner: autoSelect,
          min_sample_size: minSample,
          variants: [
            {
              name: "A",
              template_id: variantA.templateId || null,
              message_content: variantA.content || null,
              message_type: variantA.type,
              allocation_ratio: variantA.ratio,
            },
            {
              name: "B",
              template_id: variantB.templateId || null,
              message_content: variantB.content || null,
              message_type: variantB.type,
              allocation_ratio: variantB.ratio,
            },
          ],
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "作成に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* モーダルヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">新規ABテスト作成</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* テスト名 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">テスト名 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 3月キャンペーン ABテスト"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 bg-gray-50/50"
            />
          </div>

          {/* バリアントA/B */}
          <div className="grid grid-cols-2 gap-4">
            <VariantEditor
              label="A"
              color="blue"
              variant={variantA}
              templates={templates}
              onTemplateSelect={(id) => handleTemplateSelect(id, setVariantA)}
              onContentChange={(c) => setVariantA((p) => ({ ...p, content: c }))}
            />
            <VariantEditor
              label="B"
              color="rose"
              variant={variantB}
              templates={templates}
              onTemplateSelect={(id) => handleTemplateSelect(id, setVariantB)}
              onContentChange={(c) => setVariantB((p) => ({ ...p, content: c }))}
            />
          </div>

          {/* 配分比率 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">配分比率</label>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-blue-600 w-12">A: {variantA.ratio}%</span>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={variantA.ratio}
                onChange={(e) => handleRatioChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-xs font-medium text-rose-600 w-12 text-right">B: {variantB.ratio}%</span>
            </div>
            <div className="flex mt-2 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-400 transition-all" style={{ width: `${variantA.ratio}%` }} />
              <div className="bg-rose-400 transition-all" style={{ width: `${variantB.ratio}%` }} />
            </div>
          </div>

          {/* 判定基準 */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">勝者判定基準</label>
            <div className="flex gap-3">
              {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="criteria"
                    value={key}
                    checked={criteria === key}
                    onChange={() => setCriteria(key)}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 自動勝者選定 / 最低サンプル */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSelect}
                onChange={(e) => setAutoSelect(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-500"
              />
              <span className="text-sm text-gray-700">自動勝者選定</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">最低サンプルサイズ:</span>
              <input
                type="number"
                value={minSample}
                onChange={(e) => setMinSample(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                作成中...
              </>
            ) : (
              "作成"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// バリアント入力コンポーネント
// ========================================

function VariantEditor({
  label,
  color,
  variant,
  templates,
  onTemplateSelect,
  onContentChange,
}: {
  label: string;
  color: "blue" | "rose";
  variant: { templateId: string; content: string; type: string; ratio: number };
  templates: Template[];
  onTemplateSelect: (id: string) => void;
  onContentChange: (content: string) => void;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-100", text: "text-blue-600", ring: "focus:ring-blue-500/30" },
    rose: { bg: "bg-rose-100", text: "text-rose-600", ring: "focus:ring-rose-500/30" },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center text-xs font-bold ${c.text}`}>
          {label}
        </div>
        <span className="text-sm font-semibold text-gray-700">パターン{label}</span>
      </div>

      {/* テンプレート選択 */}
      <div className="mb-3">
        <select
          value={variant.templateId}
          onChange={(e) => onTemplateSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        >
          <option value="">テンプレートなし（直接入力）</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* メッセージ入力 */}
      <textarea
        value={variant.content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={`メッセージ${label}を入力`}
        rows={5}
        className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${c.ring} resize-none`}
      />
      <div className="text-right text-[10px] text-gray-400 mt-1">{variant.content.length}文字</div>
    </div>
  );
}

// ========================================
// 詳細・結果モーダル
// ========================================

function DetailModal({
  test,
  stats,
  onClose,
  onStatusChange,
}: {
  test: ABTest;
  stats: WinnerResult | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const statusInfo = STATUS_MAP[test.status] || STATUS_MAP.draft;
  const variants = test.ab_test_variants || [];

  // バーチャート用データ
  const chartData = variants.map((v, i) => {
    const sentCount = v.sent_count || 0;
    return {
      name: `パターン${v.name}`,
      openRate: sentCount > 0 ? Math.round((v.open_count / sentCount) * 1000) / 10 : 0,
      clickRate: sentCount > 0 ? Math.round((v.click_count / sentCount) * 1000) / 10 : 0,
      sent: sentCount,
      open: v.open_count || 0,
      click: v.click_count || 0,
      color: VARIANT_COLORS[i % VARIANT_COLORS.length],
    };
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">{test.name}</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.bg} ${statusInfo.textColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                {statusInfo.text}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
            <span>判定基準: {CRITERIA_LABELS[test.winner_criteria] || test.winner_criteria}</span>
            <span>自動選定: {test.auto_select_winner ? "ON" : "OFF"}</span>
            <span>最低サンプル: {test.min_sample_size}</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 勝者判定結果 */}
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

          {/* バリアント比較テーブル */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">バリアント別結果</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">バリアント</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">配分</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">送信数</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">開封数</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">開封率</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">クリック数</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">クリック率</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => {
                    const sentCount = v.sent_count || 0;
                    const openRate = sentCount > 0 ? ((v.open_count / sentCount) * 100).toFixed(1) : "0.0";
                    const clickRate = sentCount > 0 ? ((v.click_count / sentCount) * 100).toFixed(1) : "0.0";
                    const isWinner = v.id === test.winner_variant_id;

                    return (
                      <tr key={v.id} className={`border-b border-gray-50 ${isWinner ? "bg-amber-50/50" : ""}`}>
                        <td className="py-2.5 px-3">
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
                          </div>
                        </td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{v.allocation_ratio}%</td>
                        <td className="text-right py-2.5 px-3 font-medium text-gray-900">{sentCount.toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{(v.open_count || 0).toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 font-bold text-gray-900">{openRate}%</td>
                        <td className="text-right py-2.5 px-3 text-gray-600">{(v.click_count || 0).toLocaleString()}</td>
                        <td className="text-right py-2.5 px-3 font-bold text-gray-900">{clickRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* バーチャート */}
          {chartData.length > 0 && chartData.some((d) => d.sent > 0) && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">パフォーマンス比較</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={((value: number, name: string) => [`${value}%`, name === "openRate" ? "開封率" : "クリック率"]) as any}
                    />
                    <Legend formatter={(value) => (value === "openRate" ? "開封率" : "クリック率")} />
                    <Bar dataKey="openRate" name="openRate" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`open-${idx}`} fill={entry.color} opacity={0.8} />
                      ))}
                    </Bar>
                    <Bar dataKey="clickRate" name="clickRate" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`click-${idx}`} fill={entry.color} opacity={0.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* バリアントメッセージ内容 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">メッセージ内容</h3>
            <div className="grid grid-cols-2 gap-4">
              {variants.map((v, i) => (
                <div key={v.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
                    >
                      {v.name}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">パターン{v.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {v.message_content || "(テンプレート使用)"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-between">
          <div className="flex gap-2">
            {test.status === "draft" && (
              <button
                onClick={() => onStatusChange("running")}
                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                テスト開始
              </button>
            )}
            {test.status === "running" && (
              <button
                onClick={() => onStatusChange("completed")}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                テスト完了
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
