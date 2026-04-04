"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ErrorFallback } from "@/components/admin/ErrorFallback";

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
  okinawaItemName: string;
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
  kyushuItemName: string;
  packageType: string;
}

interface ShippingOptionsConfig {
  allowCustomSender: boolean;
  allowCosmeticsName: boolean;
  allowHexidin: boolean;
  allowPostOfficeHold: boolean;
}

interface ShippingConfig {
  defaultCarrier: "yamato" | "japanpost";
  standardCutoffHour: number;
  addressChangeCutoffHour: number;
  options: ShippingOptionsConfig;
  yamato: YamatoConfig;
  japanpost: JapanPostConfig;
}

const SHIPPING_CONFIG_KEY = "/api/admin/shipping/config";

export default function ShippingSettingsPage() {
  const { data: serverData, error, isLoading, mutate } = useSWR<{ config: ShippingConfig }>(SHIPPING_CONFIG_KEY);

  // フォーム編集用のローカルstate（SWRキャッシュとは独立）
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ShippingConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // SWRからデータが取得されたらローカルstateに反映（編集中でない場合のみ）
  useEffect(() => {
    if (serverData?.config && !editing) {
      setConfig(structuredClone(serverData.config));
      setOriginalConfig(structuredClone(serverData.config));
    }
  }, [serverData, editing]);

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
      setEditing(false);
      setOriginalConfig(structuredClone(config));
      await mutate();
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

  if (error) return <ErrorFallback error={error} retry={() => mutate()} />;

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">配送設定</h1>
          <p className="text-sm text-gray-500 mt-1">差出人情報・配送業者の設定</p>
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setConfig(originalConfig ? structuredClone(originalConfig) : null);
                  setEditing(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                保存する
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集する
            </button>
          )}
        </div>
      </div>

      {/* 設定コンテンツ — 非編集時はロック */}
      <div className={!editing ? "pointer-events-none opacity-60" : ""}>

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

      {/* 締め時間設定 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">発送締め時間</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">当日発送の締め時間</label>
            <select
              value={config.standardCutoffHour ?? 16}
              onChange={e => setConfig({ ...config, standardCutoffHour: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-gray-50/50"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-0.5">この時刻までの決済を当日発送とします</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">住所変更可能時間</label>
            <select
              value={config.addressChangeCutoffHour ?? 16}
              onChange={e => setConfig({ ...config, addressChangeCutoffHour: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-gray-50/50"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-0.5">発送当日のこの時刻まで住所変更可能</p>
          </div>
        </div>
      </div>

      {/* 購入画面の発送オプション */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">購入画面の発送オプション</h2>
        <p className="text-xs text-gray-400 mb-3">ONにすると購入画面で顧客が選択できるようになります</p>
        <div className="space-y-3">
          {([
            { key: "allowCustomSender" as const, label: "差出人名の変更", desc: "顧客が個人名等で発送を希望できます" },
            { key: "allowCosmeticsName" as const, label: "品名を「化粧品」に変更", desc: "九州宛は陸送注意表示、沖縄+冷蔵は不可" },
            { key: "allowHexidin" as const, label: "同梱物をヘキシジンに変更", desc: "アルコールアレルギー対応（注射商品のみ表示）" },
            { key: "allowPostOfficeHold" as const, label: "郵便局留め", desc: "郵便局名を入力して局留め発送を選択可能" },
          ]).map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.options?.[key] ?? false}
                onChange={e => setConfig({
                  ...config,
                  options: { ...(config.options || {}), [key]: e.target.checked } as ShippingOptionsConfig,
                })}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600"
              />
              <div>
                <span className="text-sm text-gray-800">{label}</span>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </label>
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
              <option value="1">冷凍</option>
              <option value="2">冷蔵</option>
            </select>
          </div>
          <Field label="品名" value={config.yamato.itemName} onChange={v => updateYamato("itemName", v)} full />
          <Field label="沖縄向け品名" value={config.yamato.okinawaItemName} onChange={v => updateYamato("okinawaItemName", v)} full hint="沖縄宛の場合に使用（航空輸送制限対応）" />
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
          <Field label="九州向け品名" value={config.japanpost.kyushuItemName} onChange={v => updateJapanPost("kyushuItemName", v)} full hint="九州宛の場合に使用（航空輸送制限対応）" />
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

      </div>{/* 非編集時ロック閉じ */}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  placeholder?: string;
  hint?: string;
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
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
