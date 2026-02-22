// りさこ（植本理紗子 / PID 20260200701）の予約を直接作成
// 2026-02-13 16:45 / 定員例外のためRPCバイパス
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const PID = "20260200701";
const DATE = "2026-02-13";
const TIME = "16:45";
const NAME = "植本理紗子";

async function main() {
  // 既存のアクティブ予約がないか確認
  const { data: existing } = await sb.from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status")
    .eq("patient_id", PID)
    .not("status", "in", '("canceled","NG")');

  if (existing && existing.length > 0) {
    console.log("既にアクティブな予約があります:", JSON.stringify(existing, null, 2));
    console.log("中止します。");
    return;
  }

  // 同スロットの予約数を確認
  const { data: slotBookings } = await sb.from("reservations")
    .select("reserve_id, patient_name, status")
    .eq("reserved_date", DATE)
    .eq("reserved_time", TIME + ":00")
    .not("status", "in", '("canceled","NG")');

  console.log(`--- ${DATE} ${TIME} の既存予約: ${slotBookings ? slotBookings.length : 0}件 ---`);
  if (slotBookings) {
    for (const b of slotBookings) {
      console.log(`  ${b.reserve_id} ${b.patient_name} (${b.status})`);
    }
  }

  // 予約作成
  const reserveId = "resv-" + Date.now();
  const { data: inserted, error: insertErr } = await sb.from("reservations")
    .insert({
      reserve_id: reserveId,
      patient_id: PID,
      patient_name: NAME,
      reserved_date: DATE,
      reserved_time: TIME,
      status: "pending",
    })
    .select();

  if (insertErr) {
    console.error("予約作成エラー:", insertErr.message);
    return;
  }
  console.log("\n--- 予約作成完了 ---");
  console.log(JSON.stringify(inserted[0], null, 2));

  // intake テーブルの reserved_date, reserved_time, reserve_id を更新
  const { data: intakeRows } = await sb.from("intake")
    .select("id")
    .eq("patient_id", PID)
    .order("created_at", { ascending: false })
    .limit(1);

  if (intakeRows && intakeRows.length > 0) {
    const intakeId = intakeRows[0].id;
    const { error: updateErr } = await sb.from("intake")
      .update({
        reserve_id: reserveId,
        reserved_date: DATE,
        reserved_time: TIME,
      })
      .eq("id", intakeId);

    if (updateErr) {
      console.error("intake更新エラー:", updateErr.message);
    } else {
      console.log(`\nintake id=${intakeId} 更新完了 (reserve_id=${reserveId}, ${DATE} ${TIME})`);
    }
  }

  console.log("\n完了: " + reserveId);
}

main().catch(console.error);
