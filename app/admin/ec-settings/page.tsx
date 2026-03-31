"use client";
// EC連携設定ページ — Shopify/BASE/カスタム連携の管理

import { useState, useEffect, useCallback } from "react";

/** 連携設定の型 */
type Integration = {
  id: string;
  platform: string;
  shop_domain: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

/** EC統計の型 */
type EcStats = {
  abandonedCount: number;
  recoveryRate: number;
  subscriptionCount: number;
};

/** プラットフォーム定義 */
const PLATFORMS = [
  { value: "shopify", label: "Shopify", color: "bg-green-100 text-green-800" },
  { value: "base", label: "BASE", color: "bg-yellow-100 text-yellow-800" },
  { value: "custom", label: "カスタム", color: "bg-slate-100 text-slate-700" },
] as const;

function getPlatformLabel(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}
function getPlatformColor(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.color ?? "bg-slate-100 text-slate-700";
}

export default function EcSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<EcStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  // フォーム
  const [formPlatform, setFormPlatform] = useState("shopify");
  const [formDomain, setFormDomain] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [intRes, statsRes] = await Promise.all([
        fetch("/api/admin/ec-integrations"),
        fetch("/api/admin/ec-stats"),
      ]);
      const intJson = await intRes.json();
      const statsJson = await statsRes.json();
      if (intJson.ok) setIntegrations(intJson.integrations);
      if (statsJson.ok) setStats(statsJson.stats);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** 連携追加 */
  const handleAdd = async () => {
    if (!formDomain.trim()) {
      setError("ショップドメインを入力してください");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ec-integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formPlatform,
          shop_domain: formDomain.trim(),
          api_key: formApiKey.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message || "追加に失敗しました");
        return;
      }
      setShowAddModal(false);
      setFormPlatform("shopify");
      setFormDomain("");
      setFormApiKey("");
      fetchData();
    } catch {
      setError("追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  /** 接続状態切り替え */
  const toggleActive = async (integration: Integration) => {
    try {
      const res = await fetch(`/api/admin/ec-integrations/${integration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !integration.is_active }),
      });
      const json = await res.json();
      if (json.ok) fetchData();
    } catch {
      setError("更新に失敗しました");
    }
  };

  /** 連携削除 */
  const handleDelete = async (id: string) => {
    if (!confirm("この連携設定を削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/ec-integrations/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) fetchData();
    } catch {
      setError("削除に失敗しました");
    }
  };

  const fmt = new Intl.NumberFormat("ja-JP");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">EC連携設定</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + 連携追加
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">カゴ落ち件数</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats ? fmt.format(stats.abandonedCount) : "—"}
            <span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">カゴ落ち回収率</p>
          <p className="text-2xl font-bold text-emerald-600">
            {stats ? `${stats.recoveryRate}%` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">アクティブサブスク</p>
          <p className="text-2xl font-bold text-slate-900">
            {stats ? fmt.format(stats.subscriptionCount) : "—"}
            <span className="text-sm font-normal text-slate-400 ml-1">件</span>
          </p>
        </div>
      </div>

      {/* 連携一覧 */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-400">読み込み中...</p>
        </div>
      ) : integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">連携が未設定です</h2>
          <p className="text-slate-500 text-sm">
            「連携追加」ボタンからShopify・BASE等のECプラットフォームを接続してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integ) => (
            <div
              key={integ.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col"
            >
              {/* プラットフォームヘッダー */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPlatformColor(integ.platform)}`}
                >
                  {getPlatformLabel(integ.platform)}
                </span>
                {integ.is_active ? (
                  <span className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    接続中
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    停止中
                  </span>
                )}
              </div>

              {/* ショップドメイン */}
              <p className="text-sm font-medium text-slate-800 mb-1">{integ.shop_domain}</p>

              {/* APIキー（マスク表示） */}
              <p className="text-xs text-slate-400 mb-2">APIキー: ****</p>

              {/* カスタムの場合Webhook URL表示 */}
              {integ.platform === "custom" && (
                <div className="bg-slate-50 rounded-lg p-2 mb-2">
                  <p className="text-xs text-slate-500 mb-0.5">Webhook URL</p>
                  <p className="text-xs text-slate-700 font-mono break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/ec/{integ.id}
                  </p>
                </div>
              )}

              {/* 最終同期日時 */}
              <p className="text-xs text-slate-400 mt-auto mb-3">
                最終同期:{" "}
                {integ.last_synced_at
                  ? new Date(integ.last_synced_at).toLocaleString("ja-JP")
                  : "未同期"}
              </p>

              {/* アクション */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(integ)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    integ.is_active
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {integ.is_active ? "停止" : "有効化"}
                </button>
                <button
                  onClick={() => handleDelete(integ.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 連携追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">EC連携を追加</h2>

            {/* プラットフォーム選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                プラットフォーム
              </label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setFormPlatform(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      formPlatform === p.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ショップドメイン */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ショップドメイン
              </label>
              <input
                type="text"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                placeholder={
                  formPlatform === "shopify"
                    ? "your-store.myshopify.com"
                    : formPlatform === "base"
                      ? "your-store.thebase.in"
                      : "your-domain.com"
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* APIキー */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                APIキー
              </label>
              <input
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder="APIキーを入力"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">
                保存後はマスク表示されます
              </p>
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
