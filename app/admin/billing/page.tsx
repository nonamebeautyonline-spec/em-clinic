"use client";

// app/admin/billing/page.tsx
// テナント側課金ダッシュボード: 契約情報・使用量・請求書/領収書

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface PlanInfo {
  planName: string;
  planLabel: string;
  monthlyFee: number;
  setupFee: number;
  messageQuota: number;
  overageUnitPrice: number;
  startedAt: string | null;
  nextBillingAt: string | null;
  status: string;
  hasStripe: boolean;
}

interface UsageInfo {
  yearMonth: string;
  messageCount: number;
  messageQuota: number;
  overageCount: number;
  overageAmount: number;
  aiReplyCount: number;
  voiceInputCount: number;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

type TabKey = "contract" | "usage" | "invoices";

/* ---------- ヘルパー ---------- */
function formatYen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

function formatDate(s: string | null): string {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("ja-JP");
  } catch {
    return "-";
  }
}

const STATUS_LABELS: Record<string, string> = {
  active: "有効",
  payment_failed: "支払い失敗",
  cancelled: "解約済み",
  pending: "保留中",
  trial: "トライアル",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  payment_failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
  trial: "bg-blue-100 text-blue-700",
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  paid: { label: "支払済", color: "bg-green-100 text-green-700" },
  pending: { label: "未払い", color: "bg-yellow-100 text-yellow-700" },
  overdue: { label: "滞納", color: "bg-red-100 text-red-700" },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-500" },
};

/* ---------- メインコンポーネント ---------- */
export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("contract");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/billing/summary", { credentials: "include" });
      if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
      const data = await res.json();
      setPlan(data.plan);
      setUsage(data.usage);
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 領収書PDFダウンロード
  const handleDownloadReceipt = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId);
    try {
      const res = await fetch(`/api/admin/billing/receipt/${invoiceId}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ダウンロード失敗");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ダウンロードに失敗しました");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const usagePercent = usage ? Math.min(100, (usage.messageCount / usage.messageQuota) * 100) : 0;

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="h-0.5 bg-gradient-to-r from-purple-400 to-indigo-500" />
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">契約・課金</h1>
          <p className="text-sm text-gray-500 mt-0.5">ご利用状況と請求書を確認できます</p>
        </div>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* タブ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex border-b border-gray-200 mt-4">
          {[
            { key: "contract" as TabKey, label: "契約情報" },
            { key: "usage" as TabKey, label: "使用量" },
            { key: "invoices" as TabKey, label: "請求書・領収書" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* 契約情報タブ */}
        {activeTab === "contract" && (
          <div className="space-y-6">
            {plan ? (
              <>
                {/* プラン概要 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">現在のプラン</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status] || "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[plan.status] || plan.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">プラン名</p>
                      <p className="text-lg font-bold text-gray-900">{plan.planLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">月額</p>
                      <p className="text-lg font-bold text-gray-900">{formatYen(plan.monthlyFee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">メッセージ枠</p>
                      <p className="text-lg font-bold text-gray-900">{plan.messageQuota.toLocaleString()}通/月</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">超過単価</p>
                      <p className="text-lg font-bold text-gray-900">{plan.overageUnitPrice}円/通</p>
                    </div>
                  </div>
                </div>

                {/* 契約詳細 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">契約詳細</h2>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-sm text-gray-500">契約開始日</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(plan.startedAt)}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-sm text-gray-500">次回請求日</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatDate(plan.nextBillingAt)}</dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-sm text-gray-500">決済方法</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {plan.hasStripe ? "Stripe自動決済" : "手動請求"}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-sm text-gray-500">初期費用</dt>
                      <dd className="text-sm font-medium text-gray-900">{formatYen(plan.setupFee)}</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-500">プラン情報が見つかりません</p>
              </div>
            )}
          </div>
        )}

        {/* 使用量タブ */}
        {activeTab === "usage" && usage && (
          <div className="space-y-6">
            {/* メッセージ使用量 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">メッセージ使用量</h2>
                  <p className="text-sm text-gray-500">{usage.yearMonth}月分</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {usage.messageCount.toLocaleString()}
                    <span className="text-sm text-gray-500 font-normal"> / {usage.messageQuota.toLocaleString()}通</span>
                  </p>
                </div>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    usagePercent >= 100 ? "bg-red-500" : usagePercent >= 80 ? "bg-amber-500" : "bg-purple-500"
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{usagePercent.toFixed(1)}% 使用</span>
                <span>残り {Math.max(0, usage.messageQuota - usage.messageCount).toLocaleString()}通</span>
              </div>

              {/* 超過情報 */}
              {usage.overageCount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    超過メッセージ: <span className="font-bold">{usage.overageCount.toLocaleString()}通</span>
                    （超過料金: <span className="font-bold">{formatYen(usage.overageAmount)}</span>）
                  </p>
                </div>
              )}
            </div>

            {/* AI・その他使用量 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">AI返信</p>
                    <p className="text-xl font-bold text-gray-900">{usage.aiReplyCount.toLocaleString()}回</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">音声入力</p>
                    <p className="text-xl font-bold text-gray-900">{usage.voiceInputCount.toLocaleString()}回</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 請求書・領収書タブ */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">請求書・領収書</h2>
              <p className="text-sm text-gray-500 mt-0.5">月別の請求書一覧と領収書のダウンロード</p>
            </div>

            {invoices.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                請求書はまだありません
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const statusInfo = INVOICE_STATUS[inv.status] || { label: inv.status, color: "bg-gray-100 text-gray-500" };
                  return (
                    <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {inv.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(inv.billing_period_start)} 〜 {formatDate(inv.billing_period_end)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-bold text-gray-900">
                          {formatYen(inv.total_amount)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {inv.status === "paid" && (
                          <button
                            onClick={() => handleDownloadReceipt(inv.id, inv.invoice_number)}
                            disabled={downloadingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
                          >
                            {downloadingId === inv.id ? (
                              <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                            領収書
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
