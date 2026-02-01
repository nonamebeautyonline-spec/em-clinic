// scripts/check-duplicates-with-status.mjs
// 重複予約をstatusも含めて詳細確認

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

async function checkWithStatus() {
  const patientIds = ['20260101381', '20260101529', '20260100132', '20260101409', '20260101586'];

  console.log("=== 重複予約の詳細確認（status含む） ===\n");

  for (const patientId of patientIds) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n--- patient_id: ${patientId} ---`);
    console.log(`予約数: ${reservations?.length || 0} 件`);

    if (reservations && reservations.length > 0) {
      // statusごとにグループ化
      const byStatus = {};
      reservations.forEach(r => {
        const status = r.status || 'null';
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(r);
      });

      console.log(`\nstatus別:`);
      for (const [status, items] of Object.entries(byStatus)) {
        console.log(`  ${status}: ${items.length} 件`);
      }

      console.log(`\n全予約:`);
      reservations.forEach((r, idx) => {
        const label = idx === 0 ? '[最新]' : `  ${idx + 1}  `;
        console.log(`  ${label} ${r.reserve_id}`);
        console.log(`       date: ${r.reserved_date}, status: ${r.status || 'null'}, created: ${r.created_at}`);
      });

      // pendingの重複をチェック
      const pendings = reservations.filter(r => r.status === 'pending' || !r.status);
      if (pendings.length > 1) {
        console.log(`\n  ⚠️ pending状態の重複: ${pendings.length} 件`);
        console.log(`  → 削除候補: ${pendings.length - 1} 件（最新1件を残す）`);
      }
    }
  }

  console.log("\n=== 確認完了 ===");
}

checkWithStatus();
