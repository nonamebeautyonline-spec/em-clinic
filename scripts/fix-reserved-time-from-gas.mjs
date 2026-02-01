// scripts/fix-reserved-time-from-gas.mjs
// GASシートから正しいreserved_timeを取得してintakeテーブルを修正

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
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

async function fixReservedTime() {
  console.log("=== GASシートからreserved_timeを補完 ===\n");

  const affectedPatients = [
    '20260101586',
    '20260101381',
    '20260100132',
    '20260100576'
  ];

  // 1. GASから問診データを取得
  console.log("1. GASから問診データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });

  if (!gasResponse.ok) {
    console.error(`❌ GAS API Error: ${gasResponse.status}`);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

  console.log(`   GAS総行数: ${gasRows.length}\n`);

  // 2. 各患者について修正
  for (const patientId of affectedPatients) {
    console.log(`\n========================================`);
    console.log(`patient_id: ${patientId}`);
    console.log(`========================================`);

    // GASから該当患者のデータを検索
    const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

    if (!gasRecord) {
      console.log(`❌ GASにデータが見つかりません`);
      continue;
    }

    const gasReserveId = gasRecord.reserved || gasRecord.reserve_id || gasRecord.reserveId;
    const gasReservedDate = gasRecord.reserved_date || gasRecord.予約日;
    const gasReservedTime = gasRecord.reserved_time || gasRecord.予約時間;

    console.log(`\n【GASデータ】`);
    console.log(`  reserve_id: ${gasReserveId || 'なし'}`);
    console.log(`  reserved_date: ${gasReservedDate || 'なし'}`);
    console.log(`  reserved_time: ${gasReservedTime || 'なし'}`);

    if (!gasReservedTime) {
      console.log(`⚠️ GASにもreserved_timeがありません`);
      continue;
    }

    // Supabaseのintakeテーブルを更新
    const { error } = await supabase
      .from("intake")
      .update({
        reserved_time: gasReservedTime
      })
      .eq("patient_id", patientId);

    if (error) {
      console.error(`❌ 更新失敗:`, error.message);
      continue;
    }

    console.log(`\n✅ intake更新成功`);
    console.log(`  reserved_time: NULL → ${gasReservedTime}`);

    // 確認
    const { data: updated } = await supabase
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (updated) {
      console.log(`\n【更新後】`);
      console.log(`  reserve_id: ${updated.reserve_id}`);
      console.log(`  reserved_date: ${updated.reserved_date}`);
      console.log(`  reserved_time: ${updated.reserved_time}`);
    }
  }

  console.log(`\n\n=== 修正完了 ===`);
}

fixReservedTime();
