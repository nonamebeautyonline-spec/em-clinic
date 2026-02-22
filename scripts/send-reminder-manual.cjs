// 前日リマインド（FLEX）手動送信スクリプト
// 2026-02-20 の予約者に対して、失敗した前日リマインドを再送信する
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LINE_API = "https://api.line.me/v2/bot/message/push";
const RULE_ID = 1; // 前日リマインド（FLEX）
const TARGET_DATE = "2026-02-20";

async function getToken(tenantId) {
  // tenant_settings からトークン取得
  const { data } = await sb
    .from("tenant_settings")
    .select("value")
    .eq("category", "line")
    .eq("key", "channel_access_token")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (data && data.value) {
    // 暗号化されている場合があるので環境変数フォールバック
    try {
      // 暗号化値はそのまま使えないので環境変数を使う
      return process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
    } catch {
      return data.value;
    }
  }
  return process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
}

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

async function getFlexColors(tenantId) {
  const { data } = await sb
    .from("tenant_settings")
    .select("value")
    .eq("category", "flex")
    .eq("key", "config")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  // デフォルト色
  return {
    headerBg: "#4A90D9",
    headerText: "#FFFFFF",
    bodyText: "#555555",
    accentColor: "#4A90D9",
  };
}

function buildReminderFlex(dateStr, timeStr, colors) {
  const formatted = formatDateTime(dateStr, timeStr);
  return {
    type: "flex",
    altText: `【明日のご予約】${formatted}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "明日のご予約", weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "予約日時", size: "sm", color: colors.bodyText },
              { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: colors.accentColor },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "明日のご予約がございます。\n変更・キャンセルをご希望の場合は、マイページよりお手続きをお願いいたします。",
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "md",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

(async () => {
  console.log("=== 前日リマインド（FLEX）手動送信 ===");
  console.log("対象日:", TARGET_DATE);

  // 1. 偽の送信済みログを削除
  const { data: oldLogs } = await sb
    .from("reminder_sent_log")
    .select("id")
    .eq("rule_id", RULE_ID);
  if (oldLogs && oldLogs.length > 0) {
    const { error: delErr } = await sb
      .from("reminder_sent_log")
      .delete()
      .eq("rule_id", RULE_ID);
    if (delErr) {
      console.error("sent_log削除エラー:", delErr.message);
      return;
    }
    console.log("偽sent_log削除:", oldLogs.length, "件");
  }

  // 2. 対象予約取得
  const { data: reservations } = await sb
    .from("reservations")
    .select("id, patient_id, patient_name, reserved_date, reserved_time, status, tenant_id")
    .eq("reserved_date", TARGET_DATE)
    .neq("status", "canceled");

  if (reservations === null || reservations.length === 0) {
    console.log("対象予約なし");
    return;
  }
  console.log("対象予約:", reservations.length, "件");

  // 3. テナントID取得（最初の予約から）
  const tenantId = reservations[0].tenant_id;
  console.log("tenant_id:", tenantId);

  // 4. 患者LINE ID取得
  const pids = [...new Set(reservations.map(r => r.patient_id))];
  const { data: patients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .in("patient_id", pids);
  const pMap = new Map((patients || []).map(p => [p.patient_id, p]));

  // 5. トークン取得
  const token = await getToken(tenantId);
  if (token === undefined || token === null || token === "") {
    console.error("LINEトークン取得失敗");
    return;
  }
  console.log("LINEトークン: OK (length=" + token.length + ")");

  // 6. FLEX色設定取得
  const colors = await getFlexColors(tenantId);

  // 7. 送信
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of reservations) {
    const p = pMap.get(r.patient_id);
    if (p === undefined || p === null || p.line_id === null || p.line_id === undefined || p.line_id.indexOf("LINE_") === 0) {
      console.log("  SKIP (LINE未連携):", r.patient_name || "不明");
      skipped++;
      continue;
    }

    const flex = buildReminderFlex(r.reserved_date, r.reserved_time, colors);

    const res = await fetch(LINE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: p.line_id,
        messages: [{ type: "flex", altText: flex.altText, contents: flex.contents }],
      }),
    });

    // sent_log記録（二重送信防止）
    await sb.from("reminder_sent_log").insert({
      tenant_id: tenantId,
      rule_id: RULE_ID,
      reservation_id: r.id,
    });

    if (res.ok) {
      // message_log記録
      await sb.from("message_log").insert({
        tenant_id: tenantId,
        patient_id: r.patient_id,
        line_uid: p.line_id,
        message_type: "reminder",
        content: flex.altText,
        flex_json: flex.contents,
        status: "sent",
        direction: "outgoing",
      });
      sent++;
      console.log("  OK:", p.name || r.patient_name, r.reserved_time);
    } else {
      const errText = await res.text().catch(() => "");
      console.error("  FAIL:", p.name || r.patient_name, res.status, errText);
      failed++;
    }
  }

  console.log("\n=== 結果 ===");
  console.log("送信成功:", sent);
  console.log("スキップ:", skipped);
  console.log("失敗:", failed);
})();
