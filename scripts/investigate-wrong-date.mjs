import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 別日予約の原因調査 ===\n");

const patientId = "20251200514";
const today = "2026-01-30";

// 1. reservationsテーブルから全予約を取得
const { data: allReservations } = await supabase
  .from("reservations")
  .select("reserve_id, reserved_date, reserved_time, status, created_at")
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false });

console.log(`【Reservations】patient_id: ${patientId}の予約履歴: ${allReservations.length}件\n`);

allReservations.forEach((r, i) => {
  const isTodayActive = r.reserved_date === today && r.status !== "canceled";
  const marker = isTodayActive ? " ← 今日のアクティブ予約" : "";
  console.log(`  ${i+1}. ${r.reserved_date} ${r.reserved_time} - ${r.status}${marker}`);
  console.log(`     reserve_id: ${r.reserve_id}`);
  console.log(`     created_at: ${r.created_at}`);
});

// 2. intakeテーブルの状態
const { data: intakeData } = await supabase
  .from("intake")
  .select("reserve_id, reserved_date, reserved_time")
  .eq("patient_id", patientId)
  .single();

console.log(`\n【Intake】現在の予約情報:`);
console.log(`  reserve_id: ${intakeData.reserve_id}`);
console.log(`  予約日時: ${intakeData.reserved_date} ${intakeData.reserved_time}`);

// 3. 原因推測
const todayReservations = allReservations.filter(r => r.reserved_date === today && r.status !== "canceled");
console.log(`\n【原因推測】`);
if (todayReservations.length > 0) {
  const todayRes = todayReservations[0];
  if (intakeData.reserve_id !== todayRes.reserve_id) {
    console.log(`✗ 今日の予約 (${todayRes.reserve_id}) とintakeの予約 (${intakeData.reserve_id}) が不一致`);
    console.log(`  → 予約を変更したが、intakeテーブルが更新されていない`);
    
    // キャンセル履歴を確認
    const canceledToday = allReservations.filter(r => r.reserved_date === today && r.status === "canceled");
    if (canceledToday.length > 0) {
      console.log(`\n  今日の日付でキャンセルされた予約: ${canceledToday.length}件`);
      canceledToday.forEach(r => {
        console.log(`    - ${r.reserved_time} (${r.reserve_id})`);
      });
      console.log(`  → 予約を変更した際に、intakeテーブルの更新に失敗した可能性`);
    }
  }
}

console.log("\n=== 調査完了 ===");
