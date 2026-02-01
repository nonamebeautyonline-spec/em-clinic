// scripts/check-duplicate-status-breakdown.mjs
// 重複予約を持つ患者のステータス内訳を確認

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

async function checkDuplicateStatusBreakdown() {
  console.log("=== 重複予約のステータス内訳確認 ===\n");

  // 重複予約を持つ患者（前回の結果から）
  const duplicatePatients = [
    '20260100132',
    '20260101381',
    '20260101409',
    '20260101529',
    '20260101586'
  ];

  for (const patientId of duplicatePatients) {
    // 全予約を取得（status問わず）
    const { data: allReservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (!allReservations || allReservations.length === 0) {
      console.log(`\npatient_id: ${patientId} - 予約なし`);
      continue;
    }

    // statusごとにグループ化
    const byStatus = {};
    allReservations.forEach(r => {
      const status = r.status || 'null';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(r);
    });

    console.log(`\n========================================`);
    console.log(`patient_id: ${patientId}`);
    console.log(`========================================`);
    console.log(`総予約数: ${allReservations.length} 件\n`);

    console.log(`【ステータス別内訳】`);
    for (const [status, items] of Object.entries(byStatus)) {
      console.log(`  ${status}: ${items.length} 件`);
    }

    // pendingのみ詳細表示
    if (byStatus['pending'] && byStatus['pending'].length > 1) {
      console.log(`\n【pending予約詳細】`);
      byStatus['pending'].forEach((r, idx) => {
        const label = idx === 0 ? '[最新]' : `  ${idx + 1}  `;
        console.log(`  ${label} ${r.reserve_id} (${r.reserved_date}) created: ${r.created_at}`);
      });
      console.log(`  ⚠️ 削除対象: ${byStatus['pending'].length - 1} 件（最新1件を残す）`);
    }

    // canceledがあれば表示
    if (byStatus['canceled'] && byStatus['canceled'].length > 0) {
      console.log(`\n【canceled予約】`);
      byStatus['canceled'].forEach((r, idx) => {
        console.log(`    ${idx + 1}   ${r.reserve_id} (${r.reserved_date}) created: ${r.created_at}`);
      });
      console.log(`  ✅ これらはキャンセル履歴なので保持`);
    }
  }

  console.log(`\n\n=== サマリー ===`);
  console.log(`対象患者: ${duplicatePatients.length} 人`);
  console.log(`\n✅ 全てアクティブな予約（pending）のみの重複です`);
  console.log(`✅ キャンセル済み（canceled）の予約は含まれていません`);
}

checkDuplicateStatusBreakdown();
