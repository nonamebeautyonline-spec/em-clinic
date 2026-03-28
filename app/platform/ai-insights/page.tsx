"use client";

// app/platform/ai-insights/page.tsx
// プラットフォーム管理: AI Insightsダッシュボード

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Rechartsコンポーネントを動的インポート（SSR回避）
const MonthlyTrendChart = dynamic(
  () => import("./ai-insights-charts").then(m => ({ default: m.MonthlyTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const RejectCategoryPie = dynamic(
  () => import("./ai-insights-charts").then(m => ({ default: m.RejectCategoryPie })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const TenantApprovalBar = dynamic(
  () => import("./ai-insights-charts").then(m => ({ default: m.TenantApprovalBar })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="h-72 bg-zinc-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-zinc-400">グラフを読み込み中...</span>
    </div>
  );
}

// --- 型定義 ---

type TabKey = "overview" | "reject" | "ranking" | "tenant" | "knowledge";

interface StatsData {
  stats: {
    totalDrafts: number;
    sentCount: number;
    rejectedCount: number;
    expiredCount: number;
    approvalRate: number;
    rejectionRate: number;
    exampleCount: number;
  };
  monthlyTrend: { month: string; total: number; sent: number; rejected: number; approvalRate: number }[];
}

interface RejectData {
  categories: { category: string; count: number }[];
  tenantRejects: { tenantId: string; tenantName: string; total: number; categories: Record<string, number> }[];
}

interface RankingData {
  examples: {
    id: number;
    question: string;
    answer: string;
    source: string;
    usedCount: number;
    tenantName: string;
    createdAt: string;
  }[];
}

interface TenantComparisonData {
  tenants: {
    tenantId: string;
    tenantName: string;
    slug: string;
    totalDrafts: number;
    sentCount: number;
    rejectedCount: number;
    approvalRate: number;
    exampleCount: number;
  }[];
}

interface KnowledgeItem {
  id: number;
  question: string;
  answer: string;
  source: string;
  used_count: number;
  created_at: string;
  updated_at: string | null;
}

// タブ定義
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "全体統計", icon: "📊" },
  { key: "reject", label: "却下分析", icon: "❌" },
  { key: "ranking", label: "学習例ランキング", icon: "🏅" },
  { key: "tenant", label: "テナント比較", icon: "🏥" },
  { key: "knowledge", label: "グローバルナレッジ", icon: "📚" },
];

// 却下カテゴリの日本語名
const REJECT_LABELS: Record<string, string> = {
  tone: "トーン不適切",
  incorrect: "内容不正確",
  too_long: "長すぎる",
  too_short: "短すぎる",
  off_topic: "的外れ",
  sensitive: "要配慮",
  other: "その他",
  未分類: "未分類",
};

// ソース名
const SOURCE_LABELS: Record<string, string> = {
  staff_edit: "スタッフ修正",
  manual_reply: "手動返信",
};

// KPIカード
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${color}`}>{icon}</div>
        <span className="text-sm font-medium text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // 各タブのデータ
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [rejectData, setRejectData] = useState<RejectData | null>(null);
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [tenantData, setTenantData] = useState<TenantComparisonData | null>(null);
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // グローバルナレッジ編集モーダル
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [modalQuestion, setModalQuestion] = useState("");
  const [modalAnswer, setModalAnswer] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const fetchSection = useCallback(async (section: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/ai-insights?section=${section}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : "データ取得に失敗しました");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/ai-insights/global-knowledge", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setKnowledgeData(json.examples || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  // タブ切替時にデータ取得
  useEffect(() => {
    switch (activeTab) {
      case "overview":
        if (!statsData) fetchSection("stats").then(d => d && setStatsData(d));
        break;
      case "reject":
        if (!rejectData) fetchSection("reject-analysis").then(d => d && setRejectData(d));
        break;
      case "ranking":
        if (!rankingData) fetchSection("quality-ranking").then(d => d && setRankingData(d));
        break;
      case "tenant":
        if (!tenantData) fetchSection("tenant-comparison").then(d => d && setTenantData(d));
        break;
      case "knowledge":
        if (knowledgeData.length === 0) fetchKnowledge();
        break;
    }
  }, [activeTab, statsData, rejectData, rankingData, tenantData, knowledgeData.length, fetchSection, fetchKnowledge]);

  // ナレッジ追加/更新
  const handleSaveKnowledge = async () => {
    if (!modalQuestion.trim() || !modalAnswer.trim()) return;
    setModalSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const body = editingItem
        ? { id: editingItem.id, question: modalQuestion, answer: modalAnswer }
        : { question: modalQuestion, answer: modalAnswer };

      const res = await fetch("/api/platform/ai-insights/global-knowledge", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowModal(false);
      setEditingItem(null);
      setModalQuestion("");
      setModalAnswer("");
      await fetchKnowledge();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setModalSaving(false);
    }
  };

  // ナレッジ削除
  const handleDeleteKnowledge = async (id: number) => {
    if (!confirm("このナレッジを削除しますか？")) return;
    try {
      const res = await fetch("/api/platform/ai-insights/global-knowledge", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchKnowledge();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">AI Insights</h1>
        <p className="text-sm text-zinc-500 mt-1">
          全テナント横断のAI返信分析 — テンプレート品質の可視化と改善
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
          <span className="ml-3 text-zinc-500">読み込み中...</span>
        </div>
      )}

      {/* タブコンテンツ */}
      {!loading && activeTab === "overview" && statsData && (
        <div>
          {/* KPIカード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="総AI返信数" value={statsData.stats.totalDrafts.toLocaleString()} sub="全期間" icon="📨" color="bg-blue-50" />
            <StatCard label="採用率" value={`${statsData.stats.approvalRate}%`} sub={`${statsData.stats.sentCount.toLocaleString()}件採用`} icon="✅" color="bg-emerald-50" />
            <StatCard label="却下率" value={`${statsData.stats.rejectionRate}%`} sub={`${statsData.stats.rejectedCount.toLocaleString()}件却下`} icon="❌" color="bg-red-50" />
            <StatCard label="学習例" value={statsData.stats.exampleCount.toLocaleString()} sub="蓄積されたナレッジ" icon="📚" color="bg-purple-50" />
          </div>

          {/* 月別トレンド */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">月別トレンド（直近6ヶ月）</h2>
            <MonthlyTrendChart data={statsData.monthlyTrend} />
          </div>
        </div>
      )}

      {!loading && activeTab === "reject" && rejectData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 却下理由分布 */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">却下理由分布</h2>
            {rejectData.categories.length > 0 ? (
              <RejectCategoryPie data={rejectData.categories} />
            ) : (
              <div className="h-60 flex items-center justify-center text-zinc-400">却下データがありません</div>
            )}
          </div>

          {/* テナント別却下 */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">テナント別却下数</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">クリニック名</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500">却下数</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">主な理由</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {rejectData.tenantRejects.map(t => {
                    const topReason = Object.entries(t.categories).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={t.tenantId} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 font-medium text-zinc-900">{t.tenantName}</td>
                        <td className="px-3 py-2 text-right text-zinc-700">{t.total}</td>
                        <td className="px-3 py-2 text-zinc-500">
                          {topReason ? `${REJECT_LABELS[topReason[0]] || topReason[0]} (${topReason[1]}件)` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rejectData.tenantRejects.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-sm">データがありません</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === "ranking" && rankingData && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">学習例品質ランキング</h2>
            <p className="text-xs text-zinc-400 mt-0.5">利用回数順 — AI返信で参照された回数が多い学習例</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 w-8">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">質問</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">回答</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">ソース</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 whitespace-nowrap">利用回数</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">テナント</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rankingData.examples.map((ex, i) => (
                  <tr key={ex.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 text-zinc-900 max-w-[200px] truncate" title={ex.question}>{ex.question}</td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[300px] truncate" title={ex.answer}>{ex.answer}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ex.source === "staff_edit" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {SOURCE_LABELS[ex.source] || ex.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">{ex.usedCount}</td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{ex.tenantName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankingData.examples.length === 0 && (
              <div className="py-12 text-center text-zinc-400">学習例がまだありません</div>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === "tenant" && tenantData && (
        <div>
          {/* テナント別採用率チャート */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">テナント別AI返信採用率</h2>
            {tenantData.tenants.length > 0 ? (
              <TenantApprovalBar
                data={tenantData.tenants.map(t => ({
                  tenantName: t.tenantName,
                  approvalRate: t.approvalRate,
                  totalDrafts: t.totalDrafts,
                }))}
              />
            ) : (
              <div className="h-40 flex items-center justify-center text-zinc-400">データがありません</div>
            )}
          </div>

          {/* テナント別テーブル */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">テナント別AI返信統計（直近30日）</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">クリニック名</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">総AI返信</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">採用</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">却下</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">採用率</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">学習例数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {tenantData.tenants.map(t => (
                    <tr key={t.tenantId} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{t.tenantName}</td>
                      <td className="px-4 py-3 text-right text-zinc-700">{t.totalDrafts}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{t.sentCount}</td>
                      <td className="px-4 py-3 text-right text-red-500">{t.rejectedCount}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={t.approvalRate >= 70 ? "text-emerald-600" : t.approvalRate >= 40 ? "text-amber-600" : "text-red-500"}>
                          {t.approvalRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-700">{t.exampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tenantData.tenants.length === 0 && (
                <div className="py-12 text-center text-zinc-400">データがありません</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === "knowledge" && (
        <div>
          {/* 追加ボタン */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingItem(null);
                setModalQuestion("");
                setModalAnswer("");
                setShowModal(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + ナレッジ追加
            </button>
          </div>

          {/* ナレッジ一覧 */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">グローバルナレッジベース</h2>
              <p className="text-xs text-zinc-400 mt-0.5">全テナント共通の模範回答 — AI返信のRAG検索で参照されます</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {knowledgeData.map(item => (
                <div key={item.id} className="px-6 py-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1">{item.question}</h3>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap line-clamp-3">{item.answer}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                        <span>利用回数: {item.used_count}</span>
                        <span>作成: {new Date(item.created_at).toLocaleDateString("ja-JP")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setModalQuestion(item.question);
                          setModalAnswer(item.answer);
                          setShowModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {knowledgeData.length === 0 && (
                <div className="py-12 text-center text-zinc-400">
                  <p className="text-lg mb-2">📚</p>
                  <p>グローバルナレッジがまだありません</p>
                  <p className="text-xs mt-1">「ナレッジ追加」ボタンから模範回答を登録してください</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 追加/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              {editingItem ? "ナレッジ編集" : "ナレッジ追加"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">質問（患者メッセージ例）</label>
                <textarea
                  value={modalQuestion}
                  onChange={e => setModalQuestion(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  placeholder="例: 薬の副作用が心配です"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">模範回答</label>
                <textarea
                  value={modalAnswer}
                  onChange={e => setModalAnswer(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  placeholder="例: ご心配いただきありがとうございます。副作用については..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveKnowledge}
                disabled={modalSaving || !modalQuestion.trim() || !modalAnswer.trim()}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white rounded-lg font-medium transition-colors"
              >
                {modalSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
