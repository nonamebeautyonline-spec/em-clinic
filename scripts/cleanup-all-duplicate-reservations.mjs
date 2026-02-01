// scripts/cleanup-all-duplicate-reservations.mjs
// 全患者の重複予約を整理（最新のみ残してそれ以外をキャンセル）

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

console.log("=== 重複予約の整理（全患者対象） ===\n");

async function cleanupDuplicateReservations() {
  // 1. 全てのpending予約を取得
  console.log("【1】全pending予約を取得中...");

  const { data: allReservations, error } = await supabase
    .from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("❌ エラー:", error.message);
    return;
  }

  console.log(`✅ ${allReservations.length}件のpending予約を取得\n`);

  // 2. patient_idごとにグループ化
  const byPatient = new Map();

  allReservations.forEach(r => {
    const pid = r.patient_id;
    if (!byPatient.has(pid)) {
      byPatient.set(pid, []);
    }
    byPatient.get(pid).push(r);
  });

  console.log("【2】患者ごとの予約数:");
  console.log(`  患者数: ${byPatient.size}人`);

  const patientsWithMultiple = Array.from(byPatient.entries()).filter(([_, reservations]) => reservations.length > 1);
  console.log(`  重複予約がある患者: ${patientsWithMultiple.length}人\n`);

  if (patientsWithMultiple.length === 0) {
    console.log("✅ 重複予約はありません");
    return;
  }

  // 3. 重複予約の詳細表示
  console.log("【3】重複予約の詳細:");
  let totalDuplicates = 0;

  patientsWithMultiple.forEach(([pid, reservations]) => {
    console.log(`\n  patient_id: ${pid} (${reservations.length}件の予約)`);
    reservations.forEach((r, idx) => {
      const marker = idx === 0 ? "✅ [最新・保持]" : "❌ [古い・削除]";
      console.log(`    ${marker} ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time} (${r.created_at})`);
    });
    totalDuplicates += reservations.length - 1;
  });

  console.log(`\n【4】削除対象: ${totalDuplicates}件\n`);

  // 4. 確認
  console.log("⚠️  このスクリプトは古い予約を自動的にキャンセルします。");
  console.log("⚠️  各患者の最新予約（created_atが最も新しい）のみが残ります。\n");

  // 5. 古い予約をキャンセル
  let canceledCount = 0;
  let errorCount = 0;

  for (const [pid, reservations] of patientsWithMultiple) {
    // 最新（created_atが最も新しい）以外をキャンセル
    // reservationsは既にcreated_at降順でソート済み
    const toCancel = reservations.slice(1); // 最初（最新）以外

    for (const r of toCancel) {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "canceled" })
        .eq("reserve_id", r.reserve_id);

      if (error) {
        console.log(`  ❌ ${r.reserve_id}: エラー - ${error.message}`);
        errorCount++;
      } else {
        canceledCount++;
      }
    }
  }

  console.log("\n【5】結果:");
  console.log(`  キャンセル成功: ${canceledCount}件`);
  console.log(`  エラー: ${errorCount}件`);

  // 6. intakeテーブルも更新（最新のreserve_idに統一）
  console.log("\n【6】intakeテーブルのreserve_id更新中...");

  let intakeUpdateCount = 0;
  let intakeErrorCount = 0;

  for (const [pid, reservations] of patientsWithMultiple) {
    const latest = reservations[0]; // 最新予約

    const { error } = await supabase
      .from("intake")
      .update({
        reserve_id: latest.reserve_id,
        reserved_date: latest.reserved_date,
        reserved_time: latest.reserved_time,
      })
      .eq("patient_id", pid);

    if (error) {
      console.log(`  ❌ patient_id ${pid}: ${error.message}`);
      intakeErrorCount++;
    } else {
      intakeUpdateCount++;
    }
  }

  console.log(`  更新成功: ${intakeUpdateCount}件`);
  console.log(`  エラー: ${intakeErrorCount}件`);

  console.log("\n=== 整理完了 ===");
}

cleanupDuplicateReservations().catch(err => {
  console.error("エラー:", err);
  process.exit(1);
});
