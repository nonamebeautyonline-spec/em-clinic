"use client";

import { useState, useEffect, useCallback } from "react";

interface MypageColorConfig {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  pageBg: string;
  primaryText: string;
}

interface MypageSectionConfig {
  showIntakeStatus: boolean;
  showReservation: boolean;
  showOrders: boolean;
  showReorder: boolean;
  showHistory: boolean;
  showSupport: boolean;
}

interface MypageContentConfig {
  clinicName: string;
  logoUrl: string;
  supportMessage: string;
  supportUrl: string;
  supportButtonLabel: string;
  supportNote: string;
}

interface MypageLabelsConfig {
  intakeButtonLabel: string;
  intakeCompleteText: string;
  intakeGuideText: string;
  intakeNoteText: string;
  reserveButtonLabel: string;
  purchaseButtonLabel: string;
  reorderButtonLabel: string;
  reservationTitle: string;
  ordersTitle: string;
  historyTitle: string;
  supportTitle: string;
  noOrdersText: string;
  noHistoryText: string;
  phoneNotice: string;
  cancelNotice: string;
}

interface MypageConfig {
  colors: MypageColorConfig;
  sections: MypageSectionConfig;
  content: MypageContentConfig;
  labels: MypageLabelsConfig;
}

const DEFAULT_CONFIG: MypageConfig = {
  colors: {
    primary: "#ec4899",
    primaryHover: "#db2777",
    primaryLight: "#fdf2f8",
    pageBg: "#FFF8FB",
    primaryText: "#be185d",
  },
  sections: {
    showIntakeStatus: true,
    showReservation: true,
    showOrders: true,
    showReorder: true,
    showHistory: true,
    showSupport: true,
  },
  content: {
    clinicName: "",
    logoUrl: "",
    supportMessage: "予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。",
    supportUrl: "https://lin.ee/BlKX38U",
    supportButtonLabel: "LINEで問い合わせる",
    supportNote: "※ 診察中・夜間など、返信までお時間をいただく場合があります。",
  },
  labels: {
    intakeButtonLabel: "問診に進む",
    intakeCompleteText: "問診はすでに完了しています",
    intakeGuideText: "問診の入力は不要です。このまま予約にお進みください。",
    intakeNoteText: "※ 問診の入力が終わると、診察予約画面に進みます。",
    reserveButtonLabel: "予約に進む",
    purchaseButtonLabel: "マンジャロを購入する（初回）",
    reorderButtonLabel: "再処方を申請する",
    reservationTitle: "次回のご予約",
    ordersTitle: "注文／申請・発送状況",
    historyTitle: "これまでの処方歴",
    supportTitle: "お困りの方へ",
    noOrdersText: "現在、発送状況の確認が必要なお薬はありません。",
    noHistoryText: "まだ処方の履歴はありません。",
    phoneNotice: "上記時間内に、090-からはじまる電話番号より携帯電話へお電話いたします。\n必ずしも開始時刻ちょうどではなく、予約枠（例：12:00〜12:15）の間に医師より順次ご連絡します。\n前の診療状況により、前後15分程度お時間が前後する場合があります。あらかじめご了承ください。",
    cancelNotice: "※ 予約の変更・キャンセルは診察予定時刻の1時間前まで可能です。",
  },
};

const SECTION_LABELS: { key: keyof MypageSectionConfig; label: string }[] = [
  { key: "showIntakeStatus", label: "問診ステータス + 予約ボタン" },
  { key: "showReservation", label: "次回予約ブロック" },
  { key: "showOrders", label: "注文・発送状況" },
  { key: "showReorder", label: "再処方申請" },
  { key: "showHistory", label: "処方履歴" },
  { key: "showSupport", label: "サポート（LINE問い合わせ）" },
];

const COLOR_LABELS: { key: keyof MypageColorConfig; label: string }[] = [
  { key: "primary", label: "メインカラー" },
  { key: "primaryHover", label: "ホバー色" },
  { key: "primaryLight", label: "薄い背景色" },
  { key: "pageBg", label: "ページ背景" },
  { key: "primaryText", label: "強調テキスト" },
];

export default function MypageSettingsPage() {
  const [config, setConfig] = useState<MypageConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mypage-settings", { credentials: "include" });
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch { /* デフォルト値を維持 */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/mypage-settings", {
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
    if (confirm("デフォルト設定に戻しますか？")) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  const updateColor = (key: keyof MypageColorConfig, value: string) => {
    setConfig(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const updateSection = (key: keyof MypageSectionConfig, value: boolean) => {
    setConfig(prev => ({ ...prev, sections: { ...prev.sections, [key]: value } }));
  };

  const updateContent = (key: keyof MypageContentConfig, value: string) => {
    setConfig(prev => ({ ...prev, content: { ...prev.content, [key]: value } }));
  };

  const updateLabel = (key: keyof MypageLabelsConfig, value: string) => {
    setConfig(prev => ({ ...prev, labels: { ...prev.labels, [key]: value } }));
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
              <h1 className="text-xl font-bold text-gray-900">マイページ設定</h1>
              <p className="text-sm text-gray-500 mt-0.5">患者向けマイページの表示をカスタマイズ</p>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-sm text-emerald-600 font-medium animate-in fade-in">保存しました</span>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                リセット
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ: 2カラム */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左カラム: 設定パネル */}
          <div className="lg:col-span-3 space-y-6">

            {/* 色設定 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">デザイン設定</h2>
                <p className="text-xs text-gray-500 mt-0.5">マイページの色合いをカスタマイズ</p>
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

            {/* セクション表示設定 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">セクション表示</h2>
                <p className="text-xs text-gray-500 mt-0.5">各セクションの表示/非表示を切り替え</p>
              </div>
              <div className="px-5 py-2">
                {SECTION_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 cursor-pointer">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      onClick={() => updateSection(key, !config.sections[key])}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        config.sections[key] ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        config.sections[key] ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* コンテンツ設定 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">コンテンツ設定</h2>
                <p className="text-xs text-gray-500 mt-0.5">テキストやURLをカスタマイズ</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">クリニック名</label>
                  <input
                    type="text"
                    value={config.content.clinicName}
                    onChange={(e) => updateContent("clinicName", e.target.value)}
                    placeholder="空欄の場合はロゴ画像を表示"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダーロゴURL</label>
                  <input
                    type="url"
                    value={config.content.logoUrl}
                    onChange={(e) => updateContent("logoUrl", e.target.value)}
                    placeholder="空欄の場合はデフォルトロゴを表示"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {config.content.logoUrl && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg inline-block">
                      <img
                        src={config.content.logoUrl}
                        alt="ロゴプレビュー"
                        className="h-10 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
                <hr className="border-gray-100" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">サポートメッセージ</label>
                  <textarea
                    value={config.content.supportMessage}
                    onChange={(e) => updateContent("supportMessage", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">問い合わせURL</label>
                    <input
                      type="url"
                      value={config.content.supportUrl}
                      onChange={(e) => updateContent("supportUrl", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ボタンラベル</label>
                    <input
                      type="text"
                      value={config.content.supportButtonLabel}
                      onChange={(e) => updateContent("supportButtonLabel", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">注釈テキスト</label>
                  <input
                    type="text"
                    value={config.content.supportNote}
                    onChange={(e) => updateContent("supportNote", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            </div>

            {/* 文言設定 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">文言設定</h2>
                <p className="text-xs text-gray-500 mt-0.5">ボタンやセクションタイトルの文言をカスタマイズ</p>
              </div>
              <div className="p-5 space-y-4">
                {([
                  { key: "intakeButtonLabel" as const, label: "問診ボタン" },
                  { key: "intakeCompleteText" as const, label: "問診完了時テキスト" },
                  { key: "intakeGuideText" as const, label: "問診完了ガイド" },
                  { key: "intakeNoteText" as const, label: "問診ボタン下の注記" },
                  { key: "reserveButtonLabel" as const, label: "予約ボタン" },
                  { key: "purchaseButtonLabel" as const, label: "初回購入ボタン" },
                  { key: "reorderButtonLabel" as const, label: "再処方申請ボタン" },
                ] as { key: keyof MypageLabelsConfig; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={config.labels[key]}
                      onChange={(e) => updateLabel(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                ))}
                <hr className="border-gray-100" />
                <p className="text-xs text-gray-500 font-medium">セクションタイトル</p>
                {([
                  { key: "reservationTitle" as const, label: "予約セクション" },
                  { key: "ordersTitle" as const, label: "注文セクション" },
                  { key: "historyTitle" as const, label: "処方歴セクション" },
                  { key: "supportTitle" as const, label: "サポートセクション" },
                ] as { key: keyof MypageLabelsConfig; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={config.labels[key]}
                      onChange={(e) => updateLabel(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                ))}
                <hr className="border-gray-100" />
                <p className="text-xs text-gray-500 font-medium">空状態テキスト</p>
                {([
                  { key: "noOrdersText" as const, label: "注文なし時" },
                  { key: "noHistoryText" as const, label: "処方歴なし時" },
                ] as { key: keyof MypageLabelsConfig; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={config.labels[key]}
                      onChange={(e) => updateLabel(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                ))}
                <hr className="border-gray-100" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話案内文言</label>
                  <textarea
                    value={config.labels.phoneNotice}
                    onChange={(e) => updateLabel("phoneNotice", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">予約変更・キャンセル注記</label>
                  <input
                    type="text"
                    value={config.labels.cancelNotice}
                    onChange={(e) => updateLabel("cancelNotice", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右カラム: プレビュー */}
          <div className="lg:col-span-2">
            <MypagePreview config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- スマホ風プレビュー ---------- */
function MypagePreview({ config }: { config: MypageConfig }) {
  const { colors, sections, content, labels } = config;

  return (
    <div className="sticky top-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">プレビュー</h3>
      {/* iPhoneフレーム */}
      <div className="mx-auto w-[320px] border-[10px] border-gray-800 rounded-[36px] overflow-hidden shadow-2xl">
        {/* ステータスバー */}
        <div className="bg-gray-800 h-6 flex items-center justify-center">
          <div className="w-16 h-1 bg-gray-600 rounded-full" />
        </div>
        {/* コンテンツ */}
        <div
          className="h-[560px] overflow-y-auto"
          style={{ backgroundColor: colors.pageBg }}
        >
          {/* ヘッダー */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
            {content.logoUrl ? (
              <img src={content.logoUrl} alt="logo" className="h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : content.clinicName ? (
              <span className="text-sm font-bold text-gray-800">{content.clinicName}</span>
            ) : (
              <span className="text-sm font-bold text-gray-800">クリニック名</span>
            )}
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gray-100" />
              <div className="w-6 h-6 rounded-full bg-gray-100" />
            </div>
          </div>

          <div className="px-3 py-3 space-y-3">
            {/* 問診CTA */}
            {sections.showIntakeStatus && (
              <button
                style={{ backgroundColor: colors.primary }}
                className="w-full rounded-xl text-white text-center py-2.5 text-xs font-semibold shadow-sm"
              >
                {labels.intakeButtonLabel}
              </button>
            )}

            {/* 予約ブロック */}
            {sections.showReservation && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <p className="text-[10px] font-bold text-gray-800 mb-2">{labels.reservationTitle}</p>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                    <span className="text-[10px] text-gray-600">2026/2/15 13:00〜13:15</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: colors.primary }}>予約済み</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 text-[9px] py-1.5 rounded-lg border border-gray-200 text-gray-600">日時を変更する</button>
                  <button className="flex-1 text-[9px] py-1.5 rounded-lg border border-gray-200 text-gray-600">キャンセルする</button>
                </div>
              </div>
            )}

            {/* 注文ブロック */}
            {sections.showOrders && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <p className="text-[10px] font-bold text-gray-800 mb-2">{labels.ordersTitle}</p>
                <div className="border border-gray-100 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500">2026/2/10</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">発送済み</span>
                  </div>
                  <p className="text-[10px] font-medium text-gray-800 mt-1">マンジャロ 2.5mg 1ヶ月</p>
                </div>
              </div>
            )}

            {/* 再処方 */}
            {sections.showReorder && (
              <div className="rounded-2xl p-3" style={{ backgroundColor: colors.primaryLight }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: colors.primaryText }}>再処方申請</p>
                <p className="text-[9px] text-gray-600">再処方を申請して薬を継続できます</p>
                <button
                  style={{ backgroundColor: colors.primary }}
                  className="mt-2 w-full text-[9px] font-medium text-white py-1.5 rounded-lg"
                >
                  {labels.reorderButtonLabel}
                </button>
              </div>
            )}

            {/* 処方履歴 */}
            {sections.showHistory && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <p className="text-[10px] font-bold text-gray-800 mb-2">{labels.historyTitle}</p>
                <div className="space-y-1.5">
                  {["2026/2/10", "2026/1/15"].map((d, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-50 pb-1.5">
                      <span className="text-[9px] text-gray-500">{d}</span>
                      <span className="text-[9px] text-gray-700">マンジャロ 2.5mg {i + 1}ヶ月</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* サポート */}
            {sections.showSupport && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <p className="text-[10px] font-bold text-gray-800 mb-1">{labels.supportTitle}</p>
                <p className="text-[9px] text-gray-600 mb-2 leading-relaxed">{content.supportMessage}</p>
                <button
                  style={{ backgroundColor: colors.primary }}
                  className="text-[9px] font-medium text-white px-3 py-1.5 rounded-lg"
                >
                  {content.supportButtonLabel}
                </button>
                <p className="mt-1.5 text-[8px] text-gray-400">{content.supportNote}</p>
              </div>
            )}

            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
