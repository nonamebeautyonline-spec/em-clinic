// イベント通知設定（通知ON/OFF + FLEXメッセージカスタマイズ統合）
"use client";

import { useState, useEffect } from "react";

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

interface FlexPaymentTexts {
  header: string;
  body: string;
}

interface FlexMessageConfig {
  colors: FlexColorConfig;
  reservationColors?: FlexColorConfig;
  shippingColors?: FlexColorConfig;
  paymentColors?: FlexColorConfig;
  reservation: FlexReservationTexts;
  shipping: FlexShippingTexts;
  payment: FlexPaymentTexts;
}

type FlexTabType = "reservation" | "shipping" | "payment";

function getColorsForTab(config: FlexMessageConfig, tab: FlexTabType): FlexColorConfig {
  switch (tab) {
    case "reservation": return config.reservationColors ?? config.colors;
    case "shipping": return config.shippingColors ?? config.colors;
    case "payment": return config.paymentColors ?? config.colors;
  }
}

const COLOR_KEY_MAP: Record<FlexTabType, "reservationColors" | "shippingColors" | "paymentColors"> = {
  reservation: "reservationColors",
  shipping: "shippingColors",
  payment: "paymentColors",
};

interface EventNotifyConfig {
  notifyReorderApply: boolean;
  notifyReorderApprove: boolean;
  notifyReorderPaid: boolean;
  intakeReminderHours: number;
  approveMessage: string;
  paymentThankMessage: string;
  notifyNoAnswer: boolean;
  noAnswerMessage: string;
}

const DEFAULT_FLEX_CONFIG: FlexMessageConfig = {
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
    truckImageUrl: "https://noname-beauty.l-ope.jp/images/truck-delivery.png",
    progressBarUrl: "https://noname-beauty.l-ope.jp/images/progress-bar.png",
  },
  payment: {
    header: "決済のご案内",
    body: "診療後はマイページより決済が可能となっております。ご確認いただけますと幸いです。",
  },
};

const DEFAULT_EVENT_CONFIG: EventNotifyConfig = {
  notifyReorderApply: true,
  notifyReorderApprove: true,
  notifyReorderPaid: true,
  intakeReminderHours: 0,
  approveMessage: "",
  paymentThankMessage: "",
  notifyNoAnswer: false,
  noAnswerMessage: "",
};

const DEFAULT_APPROVE_MESSAGE = "再処方申請が承認されました\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください";

const DEFAULT_NO_ANSWER_MESSAGE = `本日、診察予約のお時間に医師よりご連絡させていただきましたが、つながらず診察が完了しておりません💦

診察をご希望の場合は、再度メッセージにてご連絡いただけますと幸いです💌
その際、診察時間はあらためて調整させていただきますので、ご了承くださいませ☺️

ご不明点などありましたら、いつでもお気軽にご連絡ください🫧`;

const COLOR_LABELS: { key: keyof FlexColorConfig; label: string }[] = [
  { key: "headerBg", label: "ヘッダー背景色" },
  { key: "headerText", label: "ヘッダー文字色" },
  { key: "accentColor", label: "強調色（日時等）" },
  { key: "bodyText", label: "本文テキスト色" },
  { key: "buttonColor", label: "ボタン色" },
];

type TabType = "reservation" | "shipping" | "payment" | "reorder_apply" | "reorder_approve" | "reorder_paid" | "intake_reminder" | "no_answer";

const TABS: { key: TabType; label: string; group: "flex" | "event" }[] = [
  { key: "reservation", label: "予約通知", group: "flex" },
  { key: "shipping", label: "発送通知", group: "flex" },
  { key: "payment", label: "決済案内", group: "flex" },
  { key: "reorder_apply", label: "再処方申請", group: "event" },
  { key: "reorder_approve", label: "再処方承認", group: "event" },
  { key: "reorder_paid", label: "決済完了", group: "event" },
  { key: "no_answer", label: "不通通知", group: "event" },
  { key: "intake_reminder", label: "問診リマインダー", group: "event" },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

interface Props {
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function FlexSection({ onToast }: Props) {
  const [flexConfig, setFlexConfig] = useState<FlexMessageConfig>(DEFAULT_FLEX_CONFIG);
  const [eventConfig, setEventConfig] = useState<EventNotifyConfig>(DEFAULT_EVENT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("reservation");
  const [reservationSubTab, setReservationSubTab] = useState<"created" | "changed" | "canceled">("created");

  // Flex設定 + イベント通知設定を並列読み込み
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const [flexRes, eventRes] = await Promise.all([
          fetch("/api/admin/flex-settings", { credentials: "include" }),
          fetch("/api/admin/settings?category=business_rules", { credentials: "include" }),
        ]);
        const flexData = await flexRes.json();
        const eventData = await eventRes.json();
        if (!ignore) {
          if (flexData.config) setFlexConfig(flexData.config);
          if (eventData.settings && typeof eventData.settings === "object") {
            const s = eventData.settings;
            setEventConfig(prev => ({
              ...prev,
              notifyReorderApply: s.notify_reorder_apply !== undefined ? s.notify_reorder_apply !== "false" : prev.notifyReorderApply,
              notifyReorderApprove: s.notify_reorder_approve !== undefined ? s.notify_reorder_approve !== "false" : prev.notifyReorderApprove,
              notifyReorderPaid: s.notify_reorder_paid !== undefined ? s.notify_reorder_paid !== "false" : prev.notifyReorderPaid,
              intakeReminderHours: s.intake_reminder_hours ? parseInt(s.intake_reminder_hours, 10) : prev.intakeReminderHours,
              approveMessage: s.approve_message || prev.approveMessage,
              paymentThankMessage: s.payment_thank_message || prev.paymentThankMessage,
              notifyNoAnswer: s.notify_no_answer !== undefined ? s.notify_no_answer !== "false" : prev.notifyNoAnswer,
              noAnswerMessage: s.no_answer_message || prev.noAnswerMessage,
            }));
          }
        }
      } catch { /* デフォルト値を維持 */ }
      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, []);

  // Flex設定 + イベント通知設定を両方保存
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Flex設定保存
      const flexRes = await fetch("/api/admin/flex-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config: flexConfig }),
      });

      // イベント通知設定保存
      const eventEntries: { key: string; value: string }[] = [
        { key: "notify_reorder_apply", value: String(eventConfig.notifyReorderApply) },
        { key: "notify_reorder_approve", value: String(eventConfig.notifyReorderApprove) },
        { key: "notify_reorder_paid", value: String(eventConfig.notifyReorderPaid) },
        { key: "intake_reminder_hours", value: String(eventConfig.intakeReminderHours) },
        { key: "approve_message", value: eventConfig.approveMessage },
        { key: "payment_thank_message", value: eventConfig.paymentThankMessage },
        { key: "notify_no_answer", value: String(eventConfig.notifyNoAnswer) },
        { key: "no_answer_message", value: eventConfig.noAnswerMessage },
      ];
      const eventResults = await Promise.all(
        eventEntries.map(({ key, value }) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ category: "business_rules", key, value }),
          })
        )
      );

      const allOk = flexRes.ok && eventResults.every(r => r.ok);
      if (allOk) {
        setSaved(true);
        setEditing(false);
        onToast("イベント通知設定を保存しました", "success");
        setTimeout(() => setSaved(false), 3000);
      } else {
        onToast("一部の設定の保存に失敗しました", "error");
      }
    } catch {
      onToast("保存に失敗しました", "error");
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm("デフォルト設定に戻しますか？")) {
      setFlexConfig(DEFAULT_FLEX_CONFIG);
      setEventConfig(DEFAULT_EVENT_CONFIG);
    }
  };

  const updateColor = (key: keyof FlexColorConfig, value: string) => {
    if (isFlexTab) {
      const colorKey = COLOR_KEY_MAP[activeTab as FlexTabType];
      const current = getColorsForTab(flexConfig, activeTab as FlexTabType);
      setFlexConfig(prev => ({ ...prev, [colorKey]: { ...current, [key]: value } }));
    } else {
      setFlexConfig(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    }
  };
  const updateReservation = (key: keyof FlexReservationTexts, value: string) => {
    setFlexConfig(prev => ({ ...prev, reservation: { ...prev.reservation, [key]: value } }));
  };
  const updateShipping = (key: keyof FlexShippingTexts, value: string) => {
    setFlexConfig(prev => ({ ...prev, shipping: { ...prev.shipping, [key]: value } }));
  };
  const updatePayment = (key: keyof FlexPaymentTexts, value: string) => {
    setFlexConfig(prev => ({ ...prev, payment: { ...prev.payment, [key]: value } }));
  };

  const isFlexTab = activeTab === "reservation" || activeTab === "shipping" || activeTab === "payment";

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
          <h2 className="text-base font-bold text-gray-900">通知設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">各イベントの通知ON/OFFとFLEXメッセージをカスタマイズ</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600 font-medium">保存しました</span>}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                キャンセル
              </button>
              <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                リセット
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? "保存中..." : "保存する"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              編集する
            </button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${!editing ? "pointer-events-none opacity-60" : ""}`}>
        {/* ===== イベント通知タブ（Flex以外） ===== */}
        {activeTab === "reorder_apply" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">再処方申請通知</h3>
                <p className="text-xs text-gray-500 mt-0.5">患者が再処方を申請した際に管理者LINEグループへ通知</p>
              </div>
              <Toggle checked={eventConfig.notifyReorderApply} onChange={(v) => setEventConfig(prev => ({ ...prev, notifyReorderApply: v }))} disabled={!editing} />
            </div>
          </div>
        )}

        {activeTab === "reorder_approve" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">再処方承認通知</h3>
                <p className="text-xs text-gray-500 mt-0.5">Dr承認時に患者へLINEメッセージを送信</p>
              </div>
              <Toggle checked={eventConfig.notifyReorderApprove} onChange={(v) => setEventConfig(prev => ({ ...prev, notifyReorderApprove: v }))} disabled={!editing} />
            </div>
            {eventConfig.notifyReorderApprove && (
              <div className="p-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">送信メッセージ</label>
                <textarea rows={3} value={eventConfig.approveMessage}
                  onChange={(e) => setEventConfig(prev => ({ ...prev, approveMessage: e.target.value }))}
                  placeholder={DEFAULT_APPROVE_MESSAGE}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <p className="text-xs text-gray-400 mt-1">空の場合はデフォルト文言が使用されます</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "reorder_paid" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">決済完了通知</h3>
                <p className="text-xs text-gray-500 mt-0.5">決済完了時に患者へサンクスメッセージを送信</p>
              </div>
              <Toggle checked={eventConfig.notifyReorderPaid} onChange={(v) => setEventConfig(prev => ({ ...prev, notifyReorderPaid: v }))} disabled={!editing} />
            </div>
            {eventConfig.notifyReorderPaid && (
              <div className="p-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">送信メッセージ</label>
                <textarea rows={3} value={eventConfig.paymentThankMessage}
                  onChange={(e) => setEventConfig(prev => ({ ...prev, paymentThankMessage: e.target.value }))}
                  placeholder="例: お支払いありがとうございます。発送準備を進めてまいります。"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <p className="text-xs text-gray-400 mt-1">空の場合、決済完了後のサンクスメッセージは送信されません</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "no_answer" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">不通時LINE自動通知</h3>
                <p className="text-xs text-gray-500 mt-0.5">Drが不通ボタンを押した際に患者へ自動でLINEメッセージを送信</p>
              </div>
              <Toggle checked={eventConfig.notifyNoAnswer} onChange={(v) => setEventConfig(prev => ({ ...prev, notifyNoAnswer: v }))} disabled={!editing} />
            </div>
            {eventConfig.notifyNoAnswer && (
              <div className="p-5">
                <label className="block text-xs font-medium text-gray-500 mb-1">送信メッセージ</label>
                <textarea rows={6} value={eventConfig.noAnswerMessage}
                  onChange={(e) => setEventConfig(prev => ({ ...prev, noAnswerMessage: e.target.value }))}
                  placeholder={DEFAULT_NO_ANSWER_MESSAGE}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <p className="text-xs text-gray-400 mt-1">空の場合はデフォルト文言が使用されます</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "intake_reminder" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">問診後リマインダー</h3>
              <p className="text-xs text-gray-500 mt-0.5">問診完了後、指定時間以内に予約がなければ患者にLINEリマインダーを送信</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={168} value={eventConfig.intakeReminderHours}
                  onChange={(e) => setEventConfig(prev => ({ ...prev, intakeReminderHours: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-gray-500">時間後（0 = 無効）</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== Flexタブ（予約・発送・決済案内） ===== */}
        {isFlexTab && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 左カラム: 設定パネル */}
            <div className="lg:col-span-3 space-y-6">
              {/* 共通色設定 */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">配色設定</h3>
                  <p className="text-xs text-gray-500 mt-0.5">このタブ専用の配色（タブごとに個別設定可能）</p>
                </div>
                <div className="p-5 space-y-4">
                  {(() => {
                    const tabColors = getColorsForTab(flexConfig, activeTab as FlexTabType);
                    return COLOR_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-4">
                        <input type="color" value={tabColors[key]} onChange={(e) => updateColor(key, e.target.value)}
                          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                        <div className="flex-1">
                          <label className="text-sm text-gray-700 font-medium">{label}</label>
                          <input type="text" value={tabColors[key]}
                            onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateColor(key, e.target.value); }}
                            className="mt-0.5 block w-28 px-2 py-1 text-xs border border-gray-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 予約通知テキスト */}
              {activeTab === "reservation" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">予約通知テキスト</h3>
                    <p className="text-xs text-gray-500 mt-0.5">予約確定/変更/キャンセル時のメッセージ文言</p>
                  </div>
                  <div className="px-5 pt-4 flex gap-2">
                    {([
                      { key: "created" as const, label: "予約確定" },
                      { key: "changed" as const, label: "予約変更" },
                      { key: "canceled" as const, label: "キャンセル" },
                    ]).map(({ key, label }) => (
                      <button key={key} onClick={() => setReservationSubTab(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          reservationSubTab === key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:text-gray-700"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="p-5 space-y-4">
                    {reservationSubTab === "created" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                          <input type="text" value={flexConfig.reservation.createdHeader} onChange={(e) => updateReservation("createdHeader", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">電話案内</label>
                          <textarea value={flexConfig.reservation.createdPhoneNotice} onChange={(e) => updateReservation("createdPhoneNotice", e.target.value)}
                            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">補足文言</label>
                          <input type="text" value={flexConfig.reservation.createdNote} onChange={(e) => updateReservation("createdNote", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                      </>
                    )}
                    {reservationSubTab === "changed" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                          <input type="text" value={flexConfig.reservation.changedHeader} onChange={(e) => updateReservation("changedHeader", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">電話案内</label>
                          <textarea value={flexConfig.reservation.changedPhoneNotice} onChange={(e) => updateReservation("changedPhoneNotice", e.target.value)}
                            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                        </div>
                      </>
                    )}
                    {reservationSubTab === "canceled" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                          <input type="text" value={flexConfig.reservation.canceledHeader} onChange={(e) => updateReservation("canceledHeader", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">キャンセル後案内</label>
                          <textarea value={flexConfig.reservation.canceledNote} onChange={(e) => updateReservation("canceledNote", e.target.value)}
                            rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 決済案内テキスト */}
              {activeTab === "payment" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">決済案内テキスト</h3>
                    <p className="text-xs text-gray-500 mt-0.5">診察完了時に送信される決済案内メッセージの文言</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                      <input type="text" value={flexConfig.payment.header} onChange={(e) => updatePayment("header", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
                      <textarea value={flexConfig.payment.body} onChange={(e) => updatePayment("body", e.target.value)}
                        rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* 発送通知テキスト */}
              {activeTab === "shipping" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">発送通知テキスト</h3>
                    <p className="text-xs text-gray-500 mt-0.5">発送完了時のメッセージ文言</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ヘッダー文言</label>
                      <input type="text" value={flexConfig.shipping.header} onChange={(e) => updateShipping("header", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500 font-medium">配送案内</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">日時指定案内 1</label>
                      <textarea value={flexConfig.shipping.deliveryNotice1} onChange={(e) => updateShipping("deliveryNotice1", e.target.value)}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">日時指定案内 2</label>
                      <textarea value={flexConfig.shipping.deliveryNotice2} onChange={(e) => updateShipping("deliveryNotice2", e.target.value)}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500 font-medium">保管案内</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">保管案内 1</label>
                      <textarea value={flexConfig.shipping.storageNotice1} onChange={(e) => updateShipping("storageNotice1", e.target.value)}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">保管案内 2</label>
                      <textarea value={flexConfig.shipping.storageNotice2} onChange={(e) => updateShipping("storageNotice2", e.target.value)}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                    </div>
                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500 font-medium">フッター</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ボタンラベル</label>
                        <input type="text" value={flexConfig.shipping.buttonLabel} onChange={(e) => updateShipping("buttonLabel", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">フッター補足</label>
                        <input type="text" value={flexConfig.shipping.footerNote} onChange={(e) => updateShipping("footerNote", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                    </div>
                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500 font-medium">画像URL</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">トラック画像URL</label>
                      <input type="url" value={flexConfig.shipping.truckImageUrl} onChange={(e) => updateShipping("truckImageUrl", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">プログレスバー画像URL</label>
                      <input type="url" value={flexConfig.shipping.progressBarUrl} onChange={(e) => updateShipping("progressBarUrl", e.target.value)}
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
                  <ReservationPreview config={flexConfig} subTab={reservationSubTab} />
                ) : activeTab === "shipping" ? (
                  <ShippingPreview config={flexConfig} />
                ) : (
                  <PaymentPreview config={flexConfig} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 予約通知プレビュー ---------- */
function ReservationPreview({ config, subTab }: { config: FlexMessageConfig; subTab: "created" | "changed" | "canceled" }) {
  const colors = getColorsForTab(config, "reservation");
  const { reservation } = config;
  const sampleDate = "2/15(土) 14:00〜14:15";

  return (
    <div className="mx-auto w-[320px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      <div className="px-4 py-3" style={{ backgroundColor: colors.headerBg }}>
        <p className="text-base font-bold" style={{ color: colors.headerText }}>
          {subTab === "created" && reservation.createdHeader}
          {subTab === "changed" && reservation.changedHeader}
          {subTab === "canceled" && reservation.canceledHeader}
        </p>
      </div>
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

/* ---------- 決済案内プレビュー ---------- */
function PaymentPreview({ config }: { config: FlexMessageConfig }) {
  const colors = getColorsForTab(config, "payment");
  const { payment } = config;

  return (
    <div className="mx-auto w-[320px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      <div className="px-4 py-3" style={{ backgroundColor: colors.headerBg }}>
        <p className="text-base font-bold" style={{ color: colors.headerText }}>{payment.header}</p>
      </div>
      <div className="bg-white px-4 py-4">
        <p className="text-sm leading-relaxed" style={{ color: colors.bodyText }}>{payment.body}</p>
      </div>
    </div>
  );
}

/* ---------- 発送通知プレビュー ---------- */
function ShippingPreview({ config }: { config: FlexMessageConfig }) {
  const colors = getColorsForTab(config, "shipping");
  const { shipping } = config;

  return (
    <div className="mx-auto w-[320px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      <div className="px-4 py-3" style={{ backgroundColor: colors.headerBg }}>
        <p className="text-base font-bold" style={{ color: colors.headerText }}>{shipping.header}</p>
      </div>
      <div className="bg-white px-4 py-4 space-y-3">
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
      <div className="bg-white px-4 pb-4 space-y-2">
        <button className="w-full py-2.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: colors.buttonColor }}>
          {shipping.buttonLabel}
        </button>
        <p className="text-xs text-center" style={{ color: colors.bodyText }}>{shipping.footerNote}</p>
      </div>
    </div>
  );
}
