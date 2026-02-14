"use client";

import { useState, useEffect, useCallback } from "react";

interface YamatoConfig {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  senderPhoneBranch: string;
  senderEmail: string;
  billingCustomerCode: string;
  billingCategoryCode: string;
  fareManagementNo: string;
  itemName: string;
  coolType: string;
  forecastMessage: string;
  completedMessage: string;
}

interface JapanPostConfig {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  itemName: string;
  packageType: string;
}

interface ShippingConfig {
  defaultCarrier: "yamato" | "japanpost";
  yamato: YamatoConfig;
  japanpost: JapanPostConfig;
}

export default function ShippingSettingsPage() {
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shipping/config", { credentials: "include" });
    const data = await res.json();
    if (data.config) setConfig(data.config);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/shipping/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const updateYamato = (key: keyof YamatoConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, yamato: { ...config.yamato, [key]: value } });
  };

  const updateJapanPost = (key: keyof JapanPostConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, japanpost: { ...config.japanpost, [key]: value } });
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">配送設定</h1>
          <p className="text-sm text-gray-500 mt-1">差出人情報・配送業者の設定</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
          {saved ? "保存しました" : "設定を保存"}
        </button>
      </div>

      {/* デフォルトキャリア */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
        <label className="text-sm font-semibold text-gray-700 mb-3 block">デフォルト配送業者</label>
        <div className="flex gap-3">
          {(["yamato", "japanpost"] as const).map(c => (
            <button
              key={c}
              onClick={() => setConfig({ ...config, defaultCarrier: c })}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                config.defaultCarrier === c
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <div className="text-lg mb-1">{c === "yamato" ? "🚛" : "📮"}</div>
              {c === "yamato" ? "ヤマト運輸" : "日本郵便"}
            </button>
          ))}
        </div>
      </div>

      {/* ヤマト設定 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🚛 ヤマト運輸 (B2) 設定
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="差出人名" value={config.yamato.senderName} onChange={v => updateYamato("senderName", v)} />
          <Field label="差出人郵便番号" value={config.yamato.senderPostal} onChange={v => updateYamato("senderPostal", v)} />
          <Field label="差出人住所" value={config.yamato.senderAddress} onChange={v => updateYamato("senderAddress", v)} full />
          <Field label="差出人電話番号" value={config.yamato.senderPhone} onChange={v => updateYamato("senderPhone", v)} />
          <Field label="電話番号枝番" value={config.yamato.senderPhoneBranch} onChange={v => updateYamato("senderPhoneBranch", v)} />
          <Field label="差出人メール" value={config.yamato.senderEmail} onChange={v => updateYamato("senderEmail", v)} full />
          <Field label="請求先顧客コード" value={config.yamato.billingCustomerCode} onChange={v => updateYamato("billingCustomerCode", v)} />
          <Field label="請求先分類コード" value={config.yamato.billingCategoryCode} onChange={v => updateYamato("billingCategoryCode", v)} placeholder="空白可" />
          <Field label="運賃管理番号" value={config.yamato.fareManagementNo} onChange={v => updateYamato("fareManagementNo", v)} />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">クール区分</label>
            <select
              value={config.yamato.coolType}
              onChange={e => updateYamato("coolType", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="0">常温</option>
              <option value="1">冷蔵</option>
              <option value="2">冷凍</option>
            </select>
          </div>
          <Field label="品名" value={config.yamato.itemName} onChange={v => updateYamato("itemName", v)} full />
          <Field label="お届け予定メール文" value={config.yamato.forecastMessage} onChange={v => updateYamato("forecastMessage", v)} full />
          <Field label="お届け完了メール文" value={config.yamato.completedMessage} onChange={v => updateYamato("completedMessage", v)} full />
        </div>
      </div>

      {/* 日本郵便設定 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          📮 日本郵便設定
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="差出人名" value={config.japanpost.senderName} onChange={v => updateJapanPost("senderName", v)} />
          <Field label="差出人郵便番号" value={config.japanpost.senderPostal} onChange={v => updateJapanPost("senderPostal", v)} />
          <Field label="差出人住所" value={config.japanpost.senderAddress} onChange={v => updateJapanPost("senderAddress", v)} full />
          <Field label="差出人電話番号" value={config.japanpost.senderPhone} onChange={v => updateJapanPost("senderPhone", v)} />
          <Field label="品名" value={config.japanpost.itemName} onChange={v => updateJapanPost("itemName", v)} />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">配送方法</label>
            <select
              value={config.japanpost.packageType}
              onChange={e => updateJapanPost("packageType", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="ゆうパック">ゆうパック</option>
              <option value="ゆうパケット">ゆうパケット</option>
              <option value="レターパック">レターパック</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-gray-50/50"
      />
    </div>
  );
}
