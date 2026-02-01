// scripts/force-cleanup-20260100576.mjs
// 20260100576の重複予約を強制削除（最新1件のみ残す）

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

async function forceCleanup() {
  const patientId = "20260100576";

  console.log("=== 20260100576 強制クリーンアップ ===\n");

  // 全予約を取得
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`現在の予約数: ${allReservations?.length || 0} 件\n`);

  if (!allReservations || allReservations.length === 0) {
    console.log("予約なし");
    return;
  }

  // 全件表示
  console.log("全予約:");
  allReservations.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ${r.reserve_id} - ${r.reserved_date} (created: ${r.created_at})`);
  });

  // resv-1769297924720（2026-02-02）を保持
  const keepReserveId = "resv-1769297924720";
  const toDelete = allReservations.filter(r => r.reserve_id !== keepReserveId);

  console.log(`\n保持: ${keepReserveId}`);
  console.log(`削除: ${toDelete.length} 件\n`);

  for (const res of toDelete) {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("reserve_id", res.reserve_id);

    if (error) {
      console.log(`  ❌ ${res.reserve_id}: ${error.message}`);
    } else {
      console.log(`  ✅ ${res.reserve_id} 削除`);
    }
  }

  // intakeテーブルを更新
  console.log(`\nintakeテーブルを更新: reserve_id=${keepReserveId}`);
  const keepReservation = allReservations.find(r => r.reserve_id === keepReserveId);

  if (keepReservation) {
    const { error } = await supabase
      .from("intake")
      .update({
        reserve_id: keepReservation.reserve_id,
        reserved_date: keepReservation.reserved_date,
        reserved_time: keepReservation.reserved_time,
        status: keepReservation.status,
      })
      .eq("patient_id", patientId);

    if (error) {
      console.log(`  ❌ intake更新失敗: ${error.message}`);
    } else {
      console.log(`  ✅ intake更新成功`);
    }
  }

  // 最終確認
  const { data: finalReservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId);

  console.log(`\n最終予約数: ${finalReservations?.length || 0} 件`);
  if (finalReservations && finalReservations.length > 0) {
    finalReservations.forEach(r => {
      console.log(`  - ${r.reserve_id} (${r.reserved_date})`);
    });
  }

  console.log("\n=== 完了 ===");
}

forceCleanup();
