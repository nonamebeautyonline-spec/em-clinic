// scripts/delete-all-reservations-20260100576.mjs
// 20260100576の全予約を削除して取り直しさせる

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

// SERVICE_ROLE_KEYを使用（削除権限あり）
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SERVICE_ROLE_KEY;
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceRoleKey) {
  console.error("❌ SERVICE_ROLE_KEY が見つかりません");
  console.log("ANON_KEYでは削除権限がないため、SERVICE_ROLE_KEYが必要です");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteAllReservations() {
  const patientId = "20260100576";

  console.log("=== 20260100576 の全予約削除 ===\n");

  // 1. 現在の予約を確認
  const { data: currentReservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  console.log(`現在の予約数: ${currentReservations?.length || 0} 件`);
  if (currentReservations && currentReservations.length > 0) {
    currentReservations.forEach((r, idx) => {
      console.log(`  [${idx + 1}] ${r.reserve_id} (${r.reserved_date})`);
    });
  }

  // 2. reservationsテーブルから全削除
  console.log("\n予約を全削除中...");
  const { error: deleteError, count } = await supabase
    .from("reservations")
    .delete({ count: "exact" })
    .eq("patient_id", patientId);

  if (deleteError) {
    console.error(`❌ 削除失敗:`, deleteError.message);
    process.exit(1);
  }

  console.log(`✅ 削除完了: ${count} 件\n`);

  // 3. intakeテーブルの予約情報をクリア
  console.log("intakeテーブルの予約情報をクリア中...");
  const { error: updateError } = await supabase
    .from("intake")
    .update({
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
      status: null,
    })
    .eq("patient_id", patientId);

  if (updateError) {
    console.error(`❌ intake更新失敗:`, updateError.message);
  } else {
    console.log(`✅ intake更新完了\n`);
  }

  // 4. 最終確認
  const { data: finalReservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId);

  const { data: finalIntake } = await supabase
    .from("intake")
    .select("reserve_id, reserved_date, status")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log("=== 最終確認 ===");
  console.log(`reservations: ${finalReservations?.length || 0} 件`);
  console.log(`intake.reserve_id: ${finalIntake?.reserve_id || "null"}`);
  console.log(`intake.reserved_date: ${finalIntake?.reserved_date || "null"}`);

  console.log("\n✅ Supabase DBから削除完了");
  console.log("\n⚠️ GASの問診シートからも削除が必要です");
  console.log("以下のコマンドを実行してください:");
  console.log(`  GASエディタで patient_id=${patientId} の行を検索して手動削除`);
  console.log("  または、GASに削除APIを追加してから自動削除");
}

deleteAllReservations();
