// 20251200128 に予約3パターン + 発送通知のFlex送信テスト
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHANNEL_ACCESS_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
const PID = "20251200128";

async function pushMessage(lineUid, messages) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUid, messages }),
  });
  return { ok: res.ok, status: res.status };
}

// 色定義
const PINK = "#ec4899";
const PINK_DARK = "#be185d";
const WHITE = "#ffffff";
const GRAY = "#666666";
const GRAY_LIGHT = "#999999";

function formatDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[dt.getUTCDay()];
  const hhmm = timeStr.slice(0, 5);
  const [hh, mm] = hhmm.split(":").map(Number);
  const endTotal = hh * 60 + mm + 15;
  const endHH = Math.floor(endTotal / 60);
  const endMM = endTotal % 60;
  const endTime = `${endHH}:${String(endMM).padStart(2, "0")}`;
  return `${m}/${d}(${weekday}) ${hhmm}〜${endTime}`;
}

(async () => {
  // 患者のLINE UID取得
  const { data: intake } = await sb.from("intake")
    .select("line_id, patient_name")
    .eq("patient_id", PID)
    .not("line_id", "is", null)
    .limit(1)
    .single();

  if (!intake?.line_id) {
    console.log("LINE UID が見つかりません: " + PID);
    return;
  }
  console.log("患者: " + intake.patient_name + " (LINE UID: " + intake.line_id.slice(0, 8) + "...)");

  const dateStr = "2026-02-20";
  const timeStr = "14:00:00";
  const formatted = formatDateTime(dateStr, timeStr);

  // 1. 予約確定
  const createdFlex = {
    type: "flex",
    altText: `【予約確定】${formatted} のご予約を承りました`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "予約が確定しました", weight: "bold", size: "lg", color: WHITE }], backgroundColor: PINK, paddingAll: "16px" },
      body: { type: "box", layout: "vertical", contents: [
        { type: "box", layout: "vertical", contents: [
          { type: "text", text: "予約日時", size: "sm", color: GRAY },
          { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: PINK_DARK },
        ]},
        { type: "separator", margin: "md" },
        { type: "text", text: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。", size: "sm", color: GRAY, wrap: true, margin: "md" },
        { type: "text", text: "変更・キャンセルはマイページからお手続きください。", size: "sm", color: GRAY, wrap: true, margin: "sm" },
      ], paddingAll: "16px" },
    },
  };

  // 2. 予約変更
  const oldFormatted = formatDateTime("2026-02-19", "11:00:00");
  const changedFlex = {
    type: "flex",
    altText: `【予約変更】新しい日時: ${formatted}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "予約日時が変更されました", weight: "bold", size: "lg", color: WHITE }], backgroundColor: PINK, paddingAll: "16px" },
      body: { type: "box", layout: "vertical", contents: [
        { type: "box", layout: "vertical", contents: [
          { type: "text", text: oldFormatted, size: "md", color: GRAY_LIGHT },
          { type: "text", text: `→ ${formatted}`, size: "lg", weight: "bold", color: PINK_DARK, margin: "sm" },
        ]},
        { type: "separator", margin: "md" },
        { type: "text", text: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。", size: "sm", color: GRAY, wrap: true, margin: "md" },
      ], paddingAll: "16px" },
    },
  };

  // 3. 予約キャンセル
  const canceledFlex = {
    type: "flex",
    altText: `【予約キャンセル】${formatted} の予約をキャンセルしました`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "予約がキャンセルされました", weight: "bold", size: "lg", color: WHITE }], backgroundColor: PINK, paddingAll: "16px" },
      body: { type: "box", layout: "vertical", contents: [
        { type: "box", layout: "vertical", contents: [
          { type: "text", text: "キャンセルされた予約", size: "sm", color: GRAY },
          { type: "text", text: formatted, size: "lg", weight: "bold", margin: "sm", decoration: "line-through", color: GRAY_LIGHT },
        ]},
        { type: "separator", margin: "md" },
        { type: "text", text: "再度ご予約を希望される場合は、マイページから新しい日時をお選びください。", size: "sm", color: GRAY, wrap: true, margin: "md" },
      ], paddingAll: "16px" },
    },
  };

  // 4. 発送通知
  const trackingNumber = "1234-5678-9012";
  const shippingFlex = {
    type: "flex",
    altText: `【発送完了】追跡番号: ${trackingNumber} ヤマト運輸 チルド便にて発送しました`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", contents: [{ type: "text", text: "発送完了のお知らせ", weight: "bold", size: "lg", color: WHITE }], backgroundColor: PINK, paddingAll: "16px" },
      body: { type: "box", layout: "vertical", contents: [
        { type: "box", layout: "vertical", contents: [
          { type: "box", layout: "horizontal", contents: [
            { type: "text", text: "発送", size: "xs", color: GRAY, flex: 1, align: "start", gravity: "bottom" },
            { type: "image", url: "https://app.noname-beauty.jp/images/truck-delivery.png", size: "full", aspectRatio: "3:2", aspectMode: "fit", flex: 1 },
            { type: "text", text: "お届け予定", size: "xs", color: GRAY, flex: 1, align: "end", gravity: "bottom", wrap: true },
          ], alignItems: "flex-end", paddingStart: "12px", paddingEnd: "12px" },
          { type: "image", url: "https://app.noname-beauty.jp/images/progress-bar.png", size: "full", aspectRatio: "20:2", aspectMode: "cover", margin: "xs" },
          { type: "text", text: "（ヤマト運輸 チルド便）", size: "xs", color: GRAY, margin: "sm", align: "center" },
        ], backgroundColor: "#fdf2f8", cornerRadius: "8px", paddingTop: "12px", paddingBottom: "12px", paddingStart: "0px", paddingEnd: "0px" },
        { type: "box", layout: "vertical", contents: [
          { type: "text", text: "追跡番号", size: "sm", color: GRAY, align: "center" },
          { type: "text", text: trackingNumber, size: "xl", weight: "bold", margin: "sm", color: PINK_DARK, align: "center" },
        ], margin: "lg" },
        { type: "separator", margin: "md" },
        { type: "text", text: "ヤマト運輸からの発送が開始されると日時指定が可能となります。", size: "sm", color: GRAY, wrap: true, margin: "md" },
        { type: "text", text: "日時指定を希望される場合はボタンより変更をしてください。", size: "sm", color: GRAY, wrap: true, margin: "sm" },
        { type: "separator", margin: "md" },
        { type: "text", text: "お届け後、マンジャロは冷蔵保管をするようにお願いいたします。", size: "sm", color: GRAY, wrap: true, margin: "md" },
        { type: "text", text: "冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。", size: "sm", color: GRAY, wrap: true, margin: "sm" },
      ], paddingAll: "16px" },
      footer: { type: "box", layout: "vertical", contents: [
        { type: "button", style: "primary", color: PINK, action: { type: "uri", label: "配送状況を確認", uri: "https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=123456789012" } },
        { type: "text", text: "マイページからも確認が可能です", size: "xs", color: GRAY, align: "center", margin: "sm" },
      ], paddingAll: "16px" },
    },
  };

  const tests = [
    { flex: createdFlex, messageType: "reservation_created", label: "予約確定" },
    { flex: changedFlex, messageType: "reservation_changed", label: "予約変更" },
    { flex: canceledFlex, messageType: "reservation_canceled", label: "予約キャンセル" },
    { flex: shippingFlex, messageType: "shipping_notify", label: "発送通知" },
  ];

  for (const t of tests) {
    try {
      const res = await pushMessage(intake.line_id, [t.flex]);
      const status = res.ok ? "sent" : "failed";
      await sb.from("message_log").insert({
        patient_id: PID,
        line_uid: intake.line_id,
        direction: "outgoing",
        event_type: "message",
        message_type: t.messageType,
        content: `[${t.flex.altText}]`,
        flex_json: t.flex.contents,
        status,
      });
      console.log((res.ok ? "✅" : "❌") + " " + t.label + " → " + status);
    } catch (err) {
      console.log("❌ " + t.label + " → エラー: " + err.message);
    }
  }

  console.log("\n完了。トーク画面で確認してください。");
})();
