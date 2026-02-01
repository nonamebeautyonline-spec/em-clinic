// scripts/check-pending-patients-reservations.mjs
// status = "pending" の患者のreservationsテーブルを調査

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

const targetPatients = ["20251200229", "20260100576"];

async function check() {
  console.log("=== status = 'pending' の患者の予約履歴を調査 ===\n");

  for (const patientId of targetPatients) {
    console.log(`\n【patient_id: ${patientId}】\n`);

    // この患者の全予約を取得
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (!reservations || reservations.length === 0) {
      console.log("  ❌ reservationsテーブルに予約がありません");
      continue;
    }

    console.log(`  総予約数: ${reservations.length} 件\n`);

    // ステータス別に集計
    const statusCounts = {};
    reservations.forEach(r => {
      const s = r.status || "NULL";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    console.log("  ステータス別:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count} 件`);
    });

    console.log("\n  予約一覧（最新5件）:");
    reservations.slice(0, 5).forEach((r, idx) => {
      console.log(`    [${idx + 1}] ${r.reserve_id}`);
      console.log(`        date: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`        status: ${r.status || "NULL"}`);
      console.log(`        created_at: ${r.created_at}`);
    });

    if (reservations.length > 5) {
      console.log(`    ... 他 ${reservations.length - 5} 件`);
    }

    // 重複予約を分析
    const pending = reservations.filter(r => r.status === "pending");
    const canceled = reservations.filter(r => r.status === "canceled");

    console.log("\n  【分析】");
    if (pending.length > 1) {
      console.log(`    ⚠️ pending状態の予約が ${pending.length} 件あります（重複）`);
      console.log(`    → リトライで複数の予約が作成された可能性が高い`);
    } else if (pending.length === 1) {
      console.log(`    ✅ pending予約は1件のみ（正常）`);
    } else {
      console.log(`    ℹ️ pending予約はありません（すべてキャンセルまたは完了）`);
    }

    if (canceled.length > 0) {
      console.log(`    ℹ️ キャンセル済み予約: ${canceled.length} 件`);
    }

    if (reservations.length >= 10) {
      console.log(`    ⚠️ 総予約数が ${reservations.length} 件 → リトライが多かった可能性`);
    }
  }

  console.log("\n\n【結論】");
  console.log("intakeテーブルの status = 'pending' は、以下のいずれかが原因:");
  console.log("  1. リトライ時に古いコードが intakeテーブルの status を更新した");
  console.log("  2. 予約作成時のバグで intakeテーブルに status = 'pending' が書き込まれた");
  console.log("  3. データ移行時の不具合");
  console.log("\n現在のコード (app/api/reservations/route.ts 390-404行目) では、");
  console.log("intakeテーブルの status は更新しないため、今後は発生しないはずです。");
  console.log("\n【解決方法】");
  console.log("UPDATE intake SET status = NULL WHERE status = 'pending';");
}

check();
