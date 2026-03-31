#!/usr/bin/env node
// ファネルステージ対象者への一斉配信スクリプト
// Usage: node scripts/broadcast-funnel.js [--preview] [--send]

const fs = require("fs");
const path = require("path");
const https = require("https");

// .env.local読み込み
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const NO_ANSWER_BEFORE = "2026-03-27";

const MESSAGE = `当院でまだ診察を受けていない方に配信しています。

マイページより予約が可能となっております。
今週末は比較的に予約が取りやすくなっておりますが、来週以降予約が早めに埋まることが予想されます。
処方を希望される場合はお早めに予約を取ることをお勧めします。
土日の発送も行なっておりますので早めの配送を希望される場合もご安心ください。

何かわからないことがありましたらお気軽にご相談ください🌸`;

async function fetchAll(query) {
  const all = [];
  let offset = 0;
  const pageSize = 5000;
  for (;;) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) { console.error("fetchAll error:", error.message); return all; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function resolveTargets() {
  // 全patients取得
  const patients = await fetchAll(() =>
    supabase.from("patients").select("patient_id, name, line_id, tel")
      .eq("tenant_id", TENANT_ID)
  );
  console.log(`patients: ${patients.length}`);

  // 全intake取得（最新優先）
  const intakes = await fetchAll(() =>
    supabase.from("intake").select("patient_id, answers, reserve_id, status, call_status")
      .eq("tenant_id", TENANT_ID)
      .order("created_at", { ascending: false })
  );
  console.log(`intake rows: ${intakes.length}`);

  // 最新intakeマップ
  const latestIntake = new Map();
  for (const row of intakes) {
    if (!latestIntake.has(row.patient_id)) {
      latestIntake.set(row.patient_id, row);
    }
  }

  // アクティブ予約セット（キャンセル/NG以外）
  const reservations = await fetchAll(() =>
    supabase.from("reservations").select("patient_id")
      .eq("tenant_id", TENANT_ID)
      .not("status", "in", '("canceled","NG")')
  );
  const activeSet = new Set(reservations.map(r => r.patient_id));

  // ブロック済みセット
  const blocked = await fetchAll(() =>
    supabase.from("friend_summaries").select("patient_id")
      .eq("tenant_id", TENANT_ID)
      .eq("last_event_type", "unfollow")
  );
  const blockedSet = new Set(blocked.map(r => r.patient_id));

  // 不通者の予約日マップ
  const noAnswerPids = [];
  for (const [pid, intake] of latestIntake) {
    if (intake.call_status === "no_answer" || intake.call_status === "no_answer_sent") {
      noAnswerPids.push(pid);
    }
  }
  const noAnswerResDates = new Map();
  if (noAnswerPids.length > 0) {
    const resData = await fetchAll(() =>
      supabase.from("reservations").select("patient_id, reserved_date")
        .eq("tenant_id", TENANT_ID)
        .in("patient_id", noAnswerPids)
        .neq("status", "canceled")
        .order("reserved_date", { ascending: false })
    );
    for (const r of resData) {
      if (!noAnswerResDates.has(r.patient_id)) {
        noAnswerResDates.set(r.patient_id, r.reserved_date);
      }
    }
  }

  // ステージ判定
  const stageCounts = { line_only: 0, personal_info_done: 0, questionnaire_done: 0, no_answer: 0, excluded: 0 };
  const targets = [];

  for (const p of patients) {
    if (blockedSet.has(p.patient_id)) { stageCounts.excluded++; continue; }

    const intake = latestIntake.get(p.patient_id);
    let stage;

    if (intake?.status === "OK" || intake?.status === "NG") {
      stage = "diagnosed";
    } else if (intake?.call_status === "no_answer" || intake?.call_status === "no_answer_sent") {
      const resDate = noAnswerResDates.get(p.patient_id);
      if (!resDate || resDate > NO_ANSWER_BEFORE) {
        stage = "excluded_by_date";
      } else {
        stage = "no_answer";
      }
    } else if (activeSet.has(p.patient_id)) {
      stage = "has_active_reservation";
    } else if (intake?.answers && JSON.stringify(intake.answers) !== "{}" && JSON.stringify(intake.answers) !== "null") {
      stage = "questionnaire_done";
    } else if (p.tel) {
      stage = "personal_info_done";
    } else {
      stage = "line_only";
    }

    if (["line_only", "personal_info_done", "questionnaire_done", "no_answer"].includes(stage)) {
      stageCounts[stage]++;
      targets.push({ patient_id: p.patient_id, patient_name: p.name || "", line_id: p.line_id || null });
    }
  }

  console.log("\nステージ別:");
  console.log(`  LINE追加のみ: ${stageCounts.line_only}`);
  console.log(`  個人情報入力済み: ${stageCounts.personal_info_done}`);
  console.log(`  問診済み・予約なし: ${stageCounts.questionnaire_done}`);
  console.log(`  予約不通・再予約なし: ${stageCounts.no_answer}`);
  console.log(`  ブロック除外: ${stageCounts.excluded}`);
  console.log(`\n対象合計: ${targets.length} 人`);
  console.log(`LINE送信可能: ${targets.filter(t => t.line_id).length} 人`);
  console.log(`LINE UID無し: ${targets.filter(t => !t.line_id).length} 人`);

  return targets;
}

// LINE push送信
async function pushMessage(lineId, messages) {
  // テナントのLINEトークン取得
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("tenant_id", TENANT_ID)
    .eq("category", "line")
    .eq("key", "channel_access_token")
    .single();

  const channelToken = setting?.value || process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

  return new Promise((resolve) => {
    const body = JSON.stringify({ to: lineId, messages });
    const req = https.request({
      hostname: "api.line.me",
      path: "/v2/bot/message/push",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelToken}`,
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode }));
    });
    req.on("error", () => resolve({ ok: false }));
    req.write(body);
    req.end();
  });
}

async function send(targets) {
  // broadcastsレコード作成
  const { data: broadcast, error: insertErr } = await supabase
    .from("broadcasts")
    .insert({
      tenant_id: TENANT_ID,
      name: `ファネル対象一斉配信 ${new Date().toLocaleDateString("ja-JP")}`,
      filter_rules: {
        include: {
          conditions: [{
            type: "funnel_stage",
            values: ["line_only", "personal_info_done", "questionnaire_done", "no_answer"],
            payment_date_to: NO_ANSWER_BEFORE,
          }]
        }
      },
      message_content: MESSAGE,
      status: "sending",
      total_targets: targets.length,
      created_by: "admin",
    })
    .select()
    .single();

  if (insertErr) { console.error("broadcast insert error:", insertErr.message); return; }
  console.log(`\nbroadcast_id: ${broadcast.id}`);

  const sendable = targets.filter(t => t.line_id);
  const noUid = targets.filter(t => !t.line_id);
  let sentCount = 0, failedCount = 0;

  // UID無しをログ記録
  if (noUid.length > 0) {
    await supabase.from("message_log").insert(
      noUid.map(t => ({
        tenant_id: TENANT_ID,
        patient_id: t.patient_id,
        event_type: "message",
        message_type: "broadcast",
        content: MESSAGE,
        status: "no_uid",
        campaign_id: broadcast.id,
        direction: "outgoing",
      }))
    );
  }

  // 10件ずつバッチ送信
  const BATCH = 10;
  for (let i = 0; i < sendable.length; i += BATCH) {
    const batch = sendable.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (t) => {
        const resolvedMsg = MESSAGE
          .replace(/\{name\}/g, t.patient_name || "")
          .replace(/\{patient_id\}/g, t.patient_id);

        let status = "failed";
        try {
          const res = await pushMessage(t.line_id, [{ type: "text", text: resolvedMsg }]);
          status = res?.ok ? "sent" : "failed";
        } catch { /* failed */ }

        await supabase.from("message_log").insert({
          tenant_id: TENANT_ID,
          patient_id: t.patient_id,
          line_uid: t.line_id,
          event_type: "message",
          message_type: "broadcast",
          content: resolvedMsg,
          status,
          campaign_id: broadcast.id,
          direction: "outgoing",
        });

        return status === "sent";
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sentCount++;
      else failedCount++;
    }

    if ((i + BATCH) % 100 === 0 || i + BATCH >= sendable.length) {
      console.log(`進捗: ${Math.min(i + BATCH, sendable.length)}/${sendable.length} (sent: ${sentCount}, failed: ${failedCount})`);
    }
  }

  // broadcast更新
  await supabase.from("broadcasts").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
    no_uid_count: noUid.length,
  }).eq("id", broadcast.id);

  console.log(`\n完了: sent=${sentCount}, failed=${failedCount}, no_uid=${noUid.length}`);
}

async function main() {
  const mode = process.argv[2] || "--preview";
  const targets = await resolveTargets();

  if (mode === "--send") {
    console.log("\n送信開始...");
    await send(targets);
  } else {
    console.log("\n[プレビューモード] --send を付けて実行すると送信されます");
  }
}

main().catch(console.error);
