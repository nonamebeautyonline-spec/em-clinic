"use client";

// app/admin/platform/system/page.tsx
// プラットフォーム管理: システム設定ページ

import { useState, useEffect, useCallback } from "react";

/* ---------- 型定義 ---------- */
interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

type SectionId = "info" | "pricing" | "maintenance";

interface Section {
  id: SectionId;
  icon: React.ReactNode;
  label: string;
}

/* ---------- セクション定義 ---------- */
const sections: Section[] = [
  {
    id: "info",
    label: "プラットフォーム情報",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "pricing",
    label: "デフォルト料金",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "maintenance",
    label: "メンテナンス",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

/* ---------- プランの選択肢 ---------- */
const PLAN_OPTIONS = [
  { value: "trial", label: "トライアル" },
  { value: "standard", label: "スタンダード" },
  { value: "premium", label: "プレミアム" },
  { value: "enterprise", label: "エンタープライズ" },
];

/* ---------- トースト ---------- */
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {message}
    </div>
  );
}

/* ---------- ヘルパー: 設定値をMapに変換 ---------- */
function settingsToMap(
  settings: PlatformSetting[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}

/* ---------- メインコンポーネント ---------- */
export default function PlatformSystemPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("info");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // プラットフォーム情報
  const [serviceName, setServiceName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  // デフォルト料金
  const [defaultPlan, setDefaultPlan] = useState("standard");
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState("");
  const [defaultSetupFee, setDefaultSetupFee] = useState("");

  // メンテナンス
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  // 保存中フラグ
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // 設定を読み込み
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/platform/system/settings", {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `取得失敗 (${res.status})`);
      }
      const data = await res.json();
      const map = settingsToMap(data.settings || []);
      setSettingsMap(map);

      // フォームに反映
      setServiceName(map["service_name"] || "");
      setSupportEmail(map["support_email"] || "");
      setDefaultPlan(map["default_plan"] || "standard");
      setDefaultMonthlyFee(map["default_monthly_fee"] || "");
      setDefaultSetupFee(map["default_setup_fee"] || "");
      setMaintenanceEnabled(map["maintenance_mode"] === "true");
      setMaintenanceMessage(map["maintenance_message"] || "");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 設定を保存する共通関数
  const saveSettings = async (
    items: { key: string; value: string }[],
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/platform/system/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存失敗 (${res.status})`);
      }
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "保存に失敗しました";
      setToast({ message, type: "error" });
      return false;
    }
  };

  // プラットフォーム情報を保存
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    const ok = await saveSettings([
      { key: "service_name", value: serviceName },
      { key: "support_email", value: supportEmail },
    ]);
    if (ok) {
      setToast({ message: "プラットフォーム情報を保存しました", type: "success" });
      loadSettings();
    }
    setSavingInfo(false);
  };

  // デフォルト料金を保存
  const handleSavePricing = async () => {
    setSavingPricing(true);
    const ok = await saveSettings([
      { key: "default_plan", value: defaultPlan },
      { key: "default_monthly_fee", value: defaultMonthlyFee },
      { key: "default_setup_fee", value: defaultSetupFee },
    ]);
    if (ok) {
      setToast({ message: "デフォルト料金を保存しました", type: "success" });
      loadSettings();
    }
    setSavingPricing(false);
  };

  // メンテナンスモードを更新
  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      const res = await fetch(
        "/api/admin/platform/system/maintenance",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: maintenanceEnabled,
            message: maintenanceMessage,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `更新失敗 (${res.status})`);
      }
      setToast({
        message: maintenanceEnabled
          ? "メンテナンスモードを有効にしました"
          : "メンテナンスモードを解除しました",
        type: "success",
      });
      loadSettings();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "更新に失敗しました";
      setToast({ message, type: "error" });
    } finally {
      setSavingMaintenance(false);
    }
  };

  // ローディング中
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

  return (
    <div className="min-h-full bg-gray-50/50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">システム設定</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                プラットフォーム全体の設定を管理します
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* メインレイアウト */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* モバイルナビ（md未満） */}
        <div className="md:hidden mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* PCナビ（md以上） */}
          <div className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 sticky top-6">
              <nav className="space-y-0.5">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeSection === s.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`${
                        activeSection === s.id
                          ? "text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* コンテンツ領域 */}
          <div className="flex-1 min-w-0">
            {/* セクション1: プラットフォーム情報 */}
            {activeSection === "info" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* セクションヘッダー */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        プラットフォーム情報
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        サービスの基本情報を設定します
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* サービス名 */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      サービス名
                    </label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="例: Lオペ for CLINIC"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      管理画面やメール通知で表示されるサービス名です
                    </p>
                  </div>

                  {/* サポートメールアドレス */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      サポートメールアドレス
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="例: support@l-ope.jp"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      テナントからの問い合わせ先として表示されます
                    </p>
                  </div>

                  {/* 保存ボタン */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveInfo}
                      disabled={savingInfo}
                      className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingInfo ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                          保存中...
                        </span>
                      ) : (
                        "保存"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* セクション2: デフォルト料金設定 */}
            {activeSection === "pricing" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* セクションヘッダー */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        デフォルト料金設定
                      </h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        新規テナント作成時のデフォルト料金です
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* デフォルトプラン */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      デフォルトプラン
                    </label>
                    <select
                      value={defaultPlan}
                      onChange={(e) => setDefaultPlan(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PLAN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* デフォルト月額 */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      デフォルト月額
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ¥
                      </span>
                      <input
                        type="number"
                        value={defaultMonthlyFee}
                        onChange={(e) => setDefaultMonthlyFee(e.target.value)}
                        placeholder="50000"
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      税抜き金額を入力してください
                    </p>
                  </div>

                  {/* デフォルト初期費用 */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      デフォルト初期費用
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        ¥
                      </span>
                      <input
                        type="number"
                        value={defaultSetupFee}
                        onChange={(e) => setDefaultSetupFee(e.target.value)}
                        placeholder="300000"
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      導入支援込みの初期費用です
                    </p>
                  </div>

                  {/* 保存ボタン */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSavePricing}
                      disabled={savingPricing}
                      className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingPricing ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                          保存中...
                        </span>
                      ) : (
                        "保存"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* セクション3: メンテナンスモード */}
            {activeSection === "maintenance" && (
              <div className="space-y-6">
                {/* ステータスバナー */}
                {maintenanceEnabled ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        メンテナンスモードが有効です
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        テナントユーザーにメンテナンス画面が表示されています
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        システムは正常稼働中です
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        全テナントが正常にアクセスできます
                      </p>
                    </div>
                  </div>
                )}

                {/* メンテナンス設定カード */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          メンテナンスモード
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                          有効にするとテナントにメンテナンス画面を表示します
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* トグルスイッチ */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          メンテナンスモード
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {maintenanceEnabled
                            ? "現在有効 - テナントはアクセスできません"
                            : "現在無効 - 通常稼働中です"}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={maintenanceEnabled}
                        onClick={() =>
                          setMaintenanceEnabled((prev) => !prev)
                        }
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          maintenanceEnabled ? "bg-red-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            maintenanceEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* メンテナンスメッセージ（ON時のみ表示） */}
                    {maintenanceEnabled && (
                      <div className="transition-all duration-200 ease-in-out">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                          メンテナンスメッセージ
                        </label>
                        <textarea
                          value={maintenanceMessage}
                          onChange={(e) =>
                            setMaintenanceMessage(e.target.value)
                          }
                          placeholder="現在メンテナンス中です。しばらくお待ちください。"
                          rows={3}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          テナントユーザーに表示されるメッセージです
                        </p>
                      </div>
                    )}

                    {/* 更新ボタン */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveMaintenance}
                        disabled={savingMaintenance}
                        className={`px-6 py-2.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          maintenanceEnabled
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {savingMaintenance ? (
                          <span className="flex items-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                            更新中...
                          </span>
                        ) : (
                          "更新"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
