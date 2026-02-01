// scripts/restore-patient-20260100321.mjs
// GASから正しい予約情報を取得してSupabaseを修正

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const gasReservationsUrl = envVars.GAS_RESERVATIONS_URL;
const adminToken = envVars.ADMIN_TOKEN;

const patientId = "20260100321";

console.log(`=== patient_id: ${patientId} の予約情報を復元 ===\n`);

async function restore() {
  // 1. GASから予約情報取得
  console.log("【1】GASから予約情報取得中...");

  const response = await fetch(gasReservationsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "getAllReservations", token: adminToken }),
  });
  const data = await response.json();
  const allReservations = data.reservations || [];

  const patientReservations = allReservations.filter(r => {
    const pid = String(r.patient_id || r.patientId || "");
    const status = (r.status || "").toLowerCase();
    return pid === patientId && status !== "canceled" && status !== "キャンセル";
  });

  console.log(`✅ GASに${patientReservations.length}件のアクティブな予約\n`);

  if (patientReservations.length === 0) {
    console.log("❌ GASにアクティブな予約がありません");
    return;
  }

  // 最新の予約を取得
  const latest = patientReservations.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.created_at || 0);
    const timeB = new Date(b.timestamp || b.created_at || 0);
    return timeB - timeA;
  })[0];

  const reserveId = latest.reserve_id || latest.reserveId;
  const date = latest.date || latest.reserved_date;
  const time = latest.time || latest.reserved_time;

  console.log("【2】GASの最新予約:");
  console.log(`  reserve_id: ${reserveId}`);
  console.log(`  date: ${date}`);
  console.log(`  time: ${time}\n`);

  // 2. Supabase intakeテーブルを更新
  console.log("【3】Supabase intakeテーブル更新中...");

  const { error: intakeError } = await supabase
    .from("intake")
    .update({
      reserve_id: reserveId,
      reserved_date: date,
      reserved_time: time,
    })
    .eq("patient_id", patientId);

  if (intakeError) {
    console.log(`❌ intakeテーブル更新エラー: ${intakeError.message}`);
  } else {
    console.log("✅ intakeテーブル更新成功");
  }

  // 3. Supabase reservationsテーブルを確認・作成
  console.log("\n【4】Supabase reservationsテーブル確認中...");

  const { data: existingReservation } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserve_id", reserveId)
    .maybeSingle();

  if (existingReservation) {
    console.log(`✅ reservationsテーブルにレコードあり (status: ${existingReservation.status})`);

    // statusがcanceledなら戻す
    if (existingReservation.status === "canceled") {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "pending" })
        .eq("reserve_id", reserveId);

      if (error) {
        console.log(`❌ status更新エラー: ${error.message}`);
      } else {
        console.log("✅ statusをpendingに戻しました");
      }
    }
  } else {
    console.log("❌ reservationsテーブルにレコードなし → 作成します");

    const { error } = await supabase
      .from("reservations")
      .insert({
        reserve_id: reserveId,
        patient_id: patientId,
        patient_name: "川原　梨花",
        reserved_date: date,
        reserved_time: time,
        status: "pending",
        note: null,
        prescription_menu: null,
      });

    if (error) {
      console.log(`❌ reservations作成エラー: ${error.message}`);
    } else {
      console.log("✅ reservationsレコード作成成功");
    }
  }

  console.log("\n=== 復元完了 ===");
}

restore().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
