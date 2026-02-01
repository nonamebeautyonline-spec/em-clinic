// scripts/check-all-duplicate-reservations.mjs
// 全患者の重複予約をチェック

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

async function checkAllDuplicates() {
  console.log("=== 全患者の重複予約チェック ===\n");

  // 全予約を取得
  let allReservations = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("reservations")
      .select("patient_id, reserve_id, reserved_date, created_at")
      .range(offset, offset + batchSize - 1)
      .order("patient_id", { ascending: true });

    if (!data || data.length === 0) break;
    allReservations = allReservations.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`総予約数: ${allReservations.length} 件\n`);

  // patient_idごとにグループ化
  const patientGroups = {};
  for (const res of allReservations) {
    if (!patientGroups[res.patient_id]) {
      patientGroups[res.patient_id] = [];
    }
    patientGroups[res.patient_id].push(res);
  }

  // 重複（2件以上）を持つ患者を抽出
  const duplicates = [];
  for (const [patientId, reservations] of Object.entries(patientGroups)) {
    if (reservations.length > 1) {
      duplicates.push({
        patient_id: patientId,
        count: reservations.length,
        reservations: reservations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      });
    }
  }

  console.log(`重複予約を持つ患者: ${duplicates.length} 人\n`);

  if (duplicates.length === 0) {
    console.log("✅ 重複予約はありません");
    return;
  }

  // 重複数の多い順にソート
  duplicates.sort((a, b) => b.count - a.count);

  console.log("【重複予約リスト】");
  duplicates.forEach((dup, idx) => {
    console.log(`\n[${idx + 1}] patient_id: ${dup.patient_id} - ${dup.count} 件の予約`);
    dup.reservations.forEach((r, i) => {
      const label = i === 0 ? "最新" : `  ${i + 1}  `;
      console.log(`  ${label}: ${r.reserve_id} (${r.reserved_date}) created: ${r.created_at}`);
    });
  });

  // サマリー
  const totalDuplicateCount = duplicates.reduce((sum, d) => sum + d.count, 0);
  const totalExcessCount = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);

  console.log("\n=== サマリー ===");
  console.log(`重複予約を持つ患者数: ${duplicates.length} 人`);
  console.log(`重複予約の総数: ${totalDuplicateCount} 件`);
  console.log(`削除が必要な予約数: ${totalExcessCount} 件（各患者最新1件を残す場合）`);
}

checkAllDuplicates();
