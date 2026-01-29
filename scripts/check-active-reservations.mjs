// scripts/check-active-reservations.mjs
// Supabaseのアクティブな予約（pending）をチェック

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

async function checkActiveReservations() {
  console.log("=== アクティブな予約チェック ===\n");

  // 1. pending状態の予約を全て取得
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("patient_id, reserve_id, reserved_date, status, created_at")
    .eq("status", "pending")
    .order("patient_id", { ascending: true })
    .order("created_at", { ascending: false });

  if (!allReservations || allReservations.length === 0) {
    console.log("✅ pending状態の予約はありません");
    return;
  }

  console.log(`pending状態の予約: ${allReservations.length} 件\n`);

  // 2. patient_idごとにグループ化
  const patientGroups = {};
  for (const res of allReservations) {
    if (!patientGroups[res.patient_id]) {
      patientGroups[res.patient_id] = [];
    }
    patientGroups[res.patient_id].push(res);
  }

  // 3. 複数のpending予約を持つ患者を抽出
  const duplicates = [];
  for (const [patientId, reservations] of Object.entries(patientGroups)) {
    if (reservations.length > 1) {
      duplicates.push({
        patient_id: patientId,
        count: reservations.length,
        reservations,
      });
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ 全患者のアクティブな予約は1件です");
    return;
  }

  console.log(`⚠️ 複数のpending予約を持つ患者: ${duplicates.length} 人\n`);

  for (const dup of duplicates) {
    console.log(`\npatient_id: ${dup.patient_id} - ${dup.count} 件のpending予約`);
    dup.reservations.forEach((r, i) => {
      const label = i === 0 ? "[最新]" : `  ${i + 1}  `;
      console.log(`  ${label} ${r.reserve_id} (${r.reserved_date}) created: ${r.created_at}`);
    });
  }

  const totalExcess = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);

  console.log("\n=== サマリー ===");
  console.log(`複数予約を持つ患者: ${duplicates.length} 人`);
  console.log(`削除が必要な予約数: ${totalExcess} 件（各患者最新1件を残す場合）`);
}

checkActiveReservations();
