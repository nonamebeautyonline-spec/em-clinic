// scripts/check-intake-status-values.mjs
// Supabase intakeテーブルのstatusカラムの値を調査

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

async function check() {
  console.log("=== Supabase intakeテーブルのstatus値を調査 ===\n");

  // 1/30の全患者を取得
  const { data: intake130 } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, status, reserved_date")
    .eq("reserved_date", "2026-01-30")
    .order("patient_id", { ascending: true });

  if (!intake130 || intake130.length === 0) {
    console.log("❌ 1/30の患者が見つかりません");
    return;
  }

  console.log(`1/30の患者: ${intake130.length} 件\n`);

  // status値の分布を集計
  const statusCounts = {};
  intake130.forEach(r => {
    const s = r.status === null ? "NULL" : r.status === "" ? "空文字列" : r.status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  console.log("【status値の分布】");
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} 件`);
  });

  // patient 20260100576 のstatus
  const target = intake130.find(r => r.patient_id === "20260100576");

  console.log("\n【patient_id: 20260100576】");
  if (target) {
    const statusDisplay = target.status === null ? "NULL" :
                          target.status === "" ? '""（空文字列）' :
                          `"${target.status}"`;
    console.log(`  patient_id: ${target.patient_id}`);
    console.log(`  patient_name: ${target.patient_name}`);
    console.log(`  reserve_id: ${target.reserve_id}`);
    console.log(`  status: ${statusDisplay}`);

    console.log("\n【カルテページの表示条件】");
    console.log("  statusFilter === 'pending' の場合:");
    console.log("    return !s; つまり status が空文字列のもののみ表示");
    console.log("");

    if (target.status === null || target.status === "") {
      console.log("  ✅ この患者は「未診」フィルタで表示されるはず");
    } else {
      console.log(`  ❌ この患者のstatusは "${target.status}" なので除外されます`);
      console.log("\n【解決方法】");
      console.log("  以下のいずれかを実施:");
      console.log("  1. statusを空文字列に変更:");
      console.log(`     UPDATE intake SET status = '' WHERE patient_id = '20260100576';`);
      console.log("  2. statusをNULLに変更:");
      console.log(`     UPDATE intake SET status = NULL WHERE patient_id = '20260100576';`);
    }
  } else {
    console.log("  ❌ 1/30の患者リストに見つかりません");
  }

  // 他の患者のstatusも表示（サンプル5件）
  console.log("\n【他の患者のstatusサンプル（5件）】");
  intake130.slice(0, 5).forEach(r => {
    const statusDisplay = r.status === null ? "NULL" :
                          r.status === "" ? '""（空文字列）' :
                          `"${r.status}"`;
    console.log(`  ${r.patient_id} (${r.patient_name}): status = ${statusDisplay}`);
  });
}

check();
