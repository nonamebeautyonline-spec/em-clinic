"use client";

import { useState, useEffect, useCallback } from "react";

// --- 型定義 ---
interface FlexColorConfig {
  headerBg: string;
  headerText: string;
  accentColor: string;
  bodyText: string;
  buttonColor: string;
}

interface FlexReservationTexts {
  createdHeader: string;
  createdPhoneNotice: string;
  createdNote: string;
  changedHeader: string;
  changedPhoneNotice: string;
  canceledHeader: string;
  canceledNote: string;
}

interface FlexShippingTexts {
  header: string;
  deliveryNotice1: string;
  deliveryNotice2: string;
  storageNotice1: string;
  storageNotice2: string;
  buttonLabel: string;
  footerNote: string;
  truckImageUrl: string;
  progressBarUrl: string;
}

interface FlexMessageConfig {
  colors: FlexColorConfig;
  reservation: FlexReservationTexts;
  shipping: FlexShippingTexts;
}

const DEFAULT_CONFIG: FlexMessageConfig = {
  colors: {
    headerBg: "#ec4899",
    headerText: "#ffffff",
    accentColor: "#be185d",
    bodyText: "#666666",
    buttonColor: "#ec4899",
  },
  reservation: {
    createdHeader: "予約が確定しました",
    createdPhoneNotice: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
    createdNote: "変更・キャンセルはマイページからお手続きください。",
    changedHeader: "予約日時が変更されました",
    changedPhoneNotice: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
    canceledHeader: "予約がキャンセルされました",
    canceledNote: "再度ご予約を希望される場合は、マイページから新しい日時をお選びください。",
  },
  shipping: {
    header: "発送完了のお知らせ",
    deliveryNotice1: "ヤマト運輸からの発送が開始されると日時指定が可能となります。",
    deliveryNotice2: "日時指定を希望される場合はボタンより変更をしてください。",
    storageNotice1: "お届け後、マンジャロは冷蔵保管をするようにお願いいたします。",
    storageNotice2: "冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。",
    buttonLabel: "配送状況を確認",
    footerNote: "マイページからも確認が可能です",
    truckImageUrl: "https://app.noname-beauty.jp/images/truck-delivery.png",
    progressBarUrl: "https://app.noname-beauty.jp/images/progress-bar.png",
  },
};

const COLOR_LABELS: { key: keyof FlexColorConfig; label: string }[] = [
  { key: "headerBg", label: "ヘッダー背景色" },
  { key: "headerText", label: "ヘッダー文字色" },
  { key: "accentColor", label: "強調色（日時等）" },
  { key: "bodyText", label: "本文テキスト色" },
  { key: "buttonColor", label: "ボタン色" },
];

type TabType = "reservation" | "shipping";

export default function FlexSettingsPage() {
  const [config, setConfig] = useState<FlexMessageConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("reservation");
  // 予約通知サブタブ
  const [reservationSubTab, setReservationSubTab] = useState<"created" | "changed" | "canceled">("created");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/flex-settings", { credentials: "include" });
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch { /* デフォルト値を維持 */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/flex-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert("保存に失敗しました");
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm("デフォルト設定に戻しますか？")) setConfig(DEFAULT_CONFIG);
  };

  const updateColor = (key: keyof FlexColorConfig, value: string) => {
    setConfig(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const updateReservation = (key: keyof FlexReservationTexts, value: string) => {
    setConfig(prev => ({ ...prev, reservation: { ...prev.reservation, [key]: value } }));
  };

  const updateShipping = (key: keyof FlexShippingTexts, value: string) => {
    setConfig(prev => ({ ...prev, shipping: { ...prev.shipping, [key]: value } }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">LINE通知設定</h1>
              <p className="text-sm text-gray-500 mt-0.5">予約・発送時のFLEXメッセージをカスタマイズ</p>
            </div>
            <div className="flex items-center gap-2">
              {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
              <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                リセット
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { key: "reservation" as TabType, label: "予約通知" },
            { key: "shipping" as TabType, label: "発送通知" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左カラム: 設定パネル */}
          <div className="lg:col-span-3 space-y-6">
            {/* 共通色設定 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">配色設定</h2>
                <p className="text-xs text-gray-500 mt-0.5">FLEXメッセージ共通の配色</p>
              </div>
              <div className="p-5 space-y-4">
                {COLOR_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-4">
                    <input
                      type="color"
                      value={config.colors[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <div className="flex-1">
                      <label className="text-sm text-gray-700 font-medium">{label}</label>
                      <input
                        type="text"
                        value={config.colors[key]}
                        onChange={(e) => {
                          if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateColor(key, e.target.value);
                        }}
                        className="mt-0.5 block w-28 px-2 py-1 text-xs border border-gray-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 予約通知テキスト */}
            {activeTab === "reservation" && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800">予約通知テキスト</h2>
                  <p className="text-xs text-gray-500 mt-0.5">予約確定/変更/キャンセル時のメッセージ文言</p>
                </div>
                {/* サブタブ */}
                <div className="px-5 pt-4 flex gap-2">
                  {([
                    { key: "created" as const, label: "予約確定" },
                    { key: "changed" as const, label: "予約変更" },
                    { key: "canceled" as const, label: "キャンセル" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setReservationSubTab(key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        reservationSubTab === key
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="p-5 space-y-4">
                  {reservationSubTab === "created" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                        <input type="text" value={config.reservation.createdHeader} onChange={(e) => updateReservation("createdHeader", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">電話案内</label>
                        <textarea value={config.reservation.createdPhoneNotice} onChange={(e) => updateReservation("createdPhoneNotice", e.target.value)}
                          rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">補足文言</label>
                        <input type="text" value={config.reservation.createdNote} onChange={(e) => updateReservation("createdNote", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                    </>
                  )}
                  {reservationSubTab === "changed" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                        <input type="text" value={config.reservation.changedHeader} onChange={(e) => updateReservation("changedHeader", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">電話案内</label>
                        <textarea value={config.reservation.changedPhoneNotice} onChange={(e) => updateReservation("changedPhoneNotice", e.target.value)}
                          rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                      </div>
                    </>
                  )}
                  {reservationSubTab === "canceled" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                        <input type="text" value={config.reservation.canceledHeader} onChange={(e) => updateReservation("canceledHeader", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">キャンセル後案内</label>
                        <textarea value={config.reservation.canceledNote} onChange={(e) => updateReservation("canceledNote", e.target.value)}
                          rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 発送通知テキスト */}
            {activeTab === "shipping" && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800">発送通知テキスト</h2>
                  <p className="text-xs text-gray-500 mt-0.5">発送完了時のメッセージ文言</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                    <input type="text" value={config.shipping.header} onChange={(e) => updateShipping("header", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <hr className="border-gray-100" />
                  <p className="text-xs text-gray-500 font-medium">配送案内</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日時指定案内 1</label>
                    <textarea value={config.shipping.deliveryNotice1} onChange={(e) => updateShipping("deliveryNotice1", e.target.value)}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日時指定案内 2</label>
                    <textarea value={config.shipping.deliveryNotice2} onChange={(e) => updateShipping("deliveryNotice2", e.target.value)}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                  </div>
                  <hr className="border-gray-100" />
                  <p className="text-xs text-gray-500 font-medium">保管案内</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">保管案内 1</label>
                    <textarea value={config.shipping.storageNotice1} onChange={(e) => updateShipping("storageNotice1", e.target.value)}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">保管案内 2</label>
                    <textarea value={config.shipping.storageNotice2} onChange={(e) => updateShipping("storageNotice2", e.target.value)}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                  </div>
                  <hr className="border-gray-100" />
                  <p className="text-xs text-gray-500 font-medium">フッター</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ボタンラベル</label>
                      <input type="text" value={config.shipping.buttonLabel} onChange={(e) => updateShipping("buttonLabel", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">フッター補足</label>
                      <input type="text" value={config.shipping.footerNote} onChange={(e) => updateShipping("footerNote", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                  </div>
                  <hr className="border-gray-100" />
                  <p className="text-xs text-gray-500 font-medium">画像URL</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">トラック画像URL</label>
                    <input type="url" value={config.shipping.truckImageUrl} onChange={(e) => updateShipping("truckImageUrl", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">プログレスバー画像URL</label>
                    <input type="url" value={config.shipping.progressBarUrl} onChange={(e) => updateShipping("progressBarUrl", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右カラム: プレビュー */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">FLEXプレビュー</h3>
              {activeTab === "reservation" ? (
                <ReservationPreview config={config} subTab={reservationSubTab} />
              ) : (
                <ShippingPreview config={config} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 予約通知プレビュー ---------- */
function ReservationPreview({ config, subTab }: { config: FlexMessageConfig; subTab: "created" | "changed" | "canceled" }) {
  const { colors, reservation } = config;
  const sampleDate = "2/15(土) 14:00〜14:15";

  return (
    <div className="mx-auto w-[320px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="px-4 py-3" style={{ backgroundColor: colors.headerBg }}>
        <p className="text-base font-bold" style={{ color: colors.headerText }}>
          {subTab === "created" && reservation.createdHeader}
          {subTab === "changed" && reservation.changedHeader}
          {subTab === "canceled" && reservation.canceledHeader}
        </p>
      </div>
      {/* ボディ */}
      <div className="bg-white px-4 py-4 space-y-3">
        {subTab === "created" && (
          <>
            <div>
              <p className="text-xs" style={{ color: colors.bodyText }}>予約日時</p>
              <p className="text-lg font-bold mt-1" style={{ color: colors.accentColor }}>{sampleDate}</p>
            </div>
            <hr className="border-gray-100" />
            <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{reservation.createdPhoneNotice}</p>
            <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{reservation.createdNote}</p>
          </>
        )}
        {subTab === "changed" && (
          <>
            <div>
              <p className="text-sm line-through" style={{ color: "#999999" }}>2/14(金) 10:00〜10:15</p>
              <p className="text-lg font-bold mt-1" style={{ color: colors.accentColor }}>→ {sampleDate}</p>
            </div>
            <hr className="border-gray-100" />
            <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{reservation.changedPhoneNotice}</p>
          </>
        )}
        {subTab === "canceled" && (
          <>
            <div>
              <p className="text-xs" style={{ color: colors.bodyText }}>キャンセルされた予約</p>
              <p className="text-lg font-bold mt-1 line-through" style={{ color: "#999999" }}>{sampleDate}</p>
            </div>
            <hr className="border-gray-100" />
            <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{reservation.canceledNote}</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 発送通知プレビュー ---------- */
function ShippingPreview({ config }: { config: FlexMessageConfig }) {
  const { colors, shipping } = config;

  return (
    <div className="mx-auto w-[320px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="px-4 py-3" style={{ backgroundColor: colors.headerBg }}>
        <p className="text-base font-bold" style={{ color: colors.headerText }}>{shipping.header}</p>
      </div>
      {/* ボディ */}
      <div className="bg-white px-4 py-4 space-y-3">
        {/* プログレスセクション */}
        <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#fdf2f8" }}>
          <div className="flex items-end justify-between px-2">
            <span className="text-xs" style={{ color: colors.bodyText }}>発送</span>
            <span className="text-lg">🚚</span>
            <span className="text-xs" style={{ color: colors.bodyText }}>お届け予定</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: colors.buttonColor }} />
          </div>
          <p className="text-xs text-center" style={{ color: colors.bodyText }}>（ヤマト運輸 チルド便）</p>
        </div>

        {/* 追跡番号 */}
        <div className="text-center">
          <p className="text-xs" style={{ color: colors.bodyText }}>追跡番号</p>
          <p className="text-xl font-bold mt-1" style={{ color: colors.accentColor }}>1234-5678-9012</p>
        </div>

        <hr className="border-gray-100" />
        <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{shipping.deliveryNotice1}</p>
        <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{shipping.deliveryNotice2}</p>
        <hr className="border-gray-100" />
        <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{shipping.storageNotice1}</p>
        <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{shipping.storageNotice2}</p>
      </div>
      {/* フッター */}
      <div className="bg-white px-4 pb-4 space-y-2">
        <button className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: colors.buttonColor }}>
          {shipping.buttonLabel}
        </button>
        <p className="text-xs text-center" style={{ color: colors.bodyText }}>{shipping.footerNote}</p>
      </div>
    </div>
  );
}
