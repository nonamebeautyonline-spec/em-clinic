// 外部カルテ連携（EHR）設定セクション
"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---
type EhrProvider = "orca" | "csv" | "fhir";
type SyncDirection = "bidirectional" | "lope_to_ehr" | "ehr_to_lope";
type FhirAuthMethod = "bearer" | "basic" | "smart";

interface EhrConfig {
  provider: EhrProvider;
  syncDirection: SyncDirection;
  // ORCA設定
  orcaHost: string;
  orcaPort: string;
  orcaUser: string;
  orcaPassword: string;
  orcaWebOrca: boolean;
  // FHIR設定
  fhirServerUrl: string;
  fhirAuthMethod: FhirAuthMethod;
  fhirBearerToken: string;
  fhirBasicUser: string;
  fhirBasicPassword: string;
}

const DEFAULT_CONFIG: EhrConfig = {
  provider: "orca",
  syncDirection: "bidirectional",
  orcaHost: "",
  orcaPort: "8000",
  orcaUser: "",
  orcaPassword: "",
  orcaWebOrca: false,
  fhirServerUrl: "",
  fhirAuthMethod: "bearer",
  fhirBearerToken: "",
  fhirBasicUser: "",
  fhirBasicPassword: "",
};

// 設定キーの一覧（APIとの読み書きに使用）
const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG) as (keyof EhrConfig)[];

const PROVIDER_OPTIONS: { value: EhrProvider; label: string }[] = [
  { value: "orca", label: "ORCA" },
  { value: "csv", label: "CSV" },
  { value: "fhir", label: "HL7 FHIR" },
];

const SYNC_DIRECTION_OPTIONS: { value: SyncDirection; label: string }[] = [
  { value: "bidirectional", label: "双方向" },
  { value: "lope_to_ehr", label: "Lオペ → 外部カルテ" },
  { value: "ehr_to_lope", label: "外部カルテ → Lオペ" },
];

const FHIR_AUTH_OPTIONS: { value: FhirAuthMethod; label: string }[] = [
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic認証" },
  { value: "smart", label: "SMART on FHIR" },
];

interface EhrSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function EhrSection({ onToast }: EhrSectionProps) {
  const [config, setConfig] = useState<EhrConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // 接続テスト用ステート
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- 初期読み込み ---
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings?category=ehr", { credentials: "include" });
      const data = await res.json();
      if (data.settings && typeof data.settings === "object") {
        // APIから返された設定をマージ
        setConfig(prev => {
          const merged = { ...prev };
          for (const key of CONFIG_KEYS) {
            if (key in data.settings && data.settings[key] !== undefined) {
              // boolean型のキーは文字列 "true"/"false" から変換
              if (key === "orcaWebOrca") {
                (merged as Record<string, unknown>)[key] =
                  data.settings[key] === true || data.settings[key] === "true";
              } else {
                (merged as Record<string, unknown>)[key] = data.settings[key];
              }
            }
          }
          return merged;
        });
      }
    } catch {
      /* デフォルト値を維持 */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // --- 保存 ---
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // 各キーを個別にPUTで保存
      const promises = CONFIG_KEYS.map(key =>
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            category: "ehr",
            key,
            value: String(config[key]),
          }),
        })
      );
      const results = await Promise.all(promises);
      const allOk = results.every(r => r.ok);
      if (allOk) {
        setSaved(true);
        onToast("外部カルテ連携設定を保存しました", "success");
        setTimeout(() => setSaved(false), 3000);
      } else {
        onToast("一部の設定の保存に失敗しました", "error");
      }
    } catch {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  // --- 接続テスト ---
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ehr/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ ok: true, message: data.message || "接続に成功しました" });
      } else {
        setTestResult({ ok: false, message: data.error || "接続に失敗しました" });
      }
    } catch {
      setTestResult({ ok: false, message: "接続テストに失敗しました" });
    }
    setTesting(false);
  };

  // --- 値更新ヘルパー ---
  const updateField = <K extends keyof EhrConfig>(key: K, value: EhrConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // --- ローディング表示 ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">外部カルテ連携</h2>
          <p className="text-xs text-gray-500 mt-0.5">電子カルテシステムとの接続設定</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* プロバイダー選択 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">接続先カルテシステム</h3>
            <p className="text-xs text-gray-500 mt-0.5">連携するカルテシステムの種類を選択</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">プロバイダー</label>
              <select
                value={config.provider}
                onChange={(e) => updateField("provider", e.target.value as EhrProvider)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PROVIDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">同期方向</label>
              <select
                value={config.syncDirection}
                onChange={(e) => updateField("syncDirection", e.target.value as SyncDirection)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SYNC_DIRECTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ORCA設定 */}
        {config.provider === "orca" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">ORCA接続設定</h3>
              <p className="text-xs text-gray-500 mt-0.5">日医標準レセプトソフトORCAへの接続情報</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ホスト名</label>
                  <input
                    type="text"
                    value={config.orcaHost}
                    onChange={(e) => updateField("orcaHost", e.target.value)}
                    placeholder="例: 192.168.1.100"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ポート番号</label>
                  <input
                    type="number"
                    value={config.orcaPort}
                    onChange={(e) => updateField("orcaPort", e.target.value)}
                    placeholder="8000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
                  <input
                    type="text"
                    value={config.orcaUser}
                    onChange={(e) => updateField("orcaUser", e.target.value)}
                    placeholder="ORCA APIユーザー名"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                  <input
                    type="password"
                    value={config.orcaPassword}
                    onChange={(e) => updateField("orcaPassword", e.target.value)}
                    placeholder="ORCA APIパスワード"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => updateField("orcaWebOrca", !config.orcaWebOrca)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    config.orcaWebOrca ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      config.orcaWebOrca ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">WebORCA（クラウド版ORCA）を使用</span>
              </div>
            </div>
          </div>
        )}

        {/* FHIR設定 */}
        {config.provider === "fhir" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">HL7 FHIR接続設定</h3>
              <p className="text-xs text-gray-500 mt-0.5">FHIRサーバーへの接続情報と認証設定</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FHIRサーバーURL</label>
                <input
                  type="text"
                  value={config.fhirServerUrl}
                  onChange={(e) => updateField("fhirServerUrl", e.target.value)}
                  placeholder="例: https://fhir.example.com/r4"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">認証方式</label>
                <select
                  value={config.fhirAuthMethod}
                  onChange={(e) => updateField("fhirAuthMethod", e.target.value as FhirAuthMethod)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {FHIR_AUTH_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Bearer Token認証 */}
              {config.fhirAuthMethod === "bearer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token</label>
                  <input
                    type="password"
                    value={config.fhirBearerToken}
                    onChange={(e) => updateField("fhirBearerToken", e.target.value)}
                    placeholder="アクセストークンを入力"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Basic認証 */}
              {config.fhirAuthMethod === "basic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
                    <input
                      type="text"
                      value={config.fhirBasicUser}
                      onChange={(e) => updateField("fhirBasicUser", e.target.value)}
                      placeholder="ユーザー名"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                    <input
                      type="password"
                      value={config.fhirBasicPassword}
                      onChange={(e) => updateField("fhirBasicPassword", e.target.value)}
                      placeholder="パスワード"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* SMART on FHIR（説明のみ） */}
              {config.fhirAuthMethod === "smart" && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    SMART on FHIR認証は OAuth 2.0 ベースの認可フローを使用します。
                    設定を保存後、接続テストを実行してください。初回はブラウザで認可画面が開きます。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV設定 */}
        {config.provider === "csv" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">CSVインポート・エクスポート</h3>
              <p className="text-xs text-gray-500 mt-0.5">CSVファイルによるデータ連携</p>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  CSVファイルのインポート・エクスポートは同期ダッシュボードから行えます
                </p>
                <a
                  href="/admin/ehr/sync-dashboard"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  同期ダッシュボードを開く
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 接続テスト */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">接続テスト</h3>
            <p className="text-xs text-gray-500 mt-0.5">設定した接続情報でカルテシステムへの疎通を確認</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {testing ? "テスト中..." : "接続テストを実行"}
              </button>
              {/* テスト結果バッジ */}
              {testResult && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${
                    testResult.ok
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {testResult.ok ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
