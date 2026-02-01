// scripts/check-intake-status-pending.mjs
// Supabase intakeテーブルで status = "pending" の患者を全件調査

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
  console.log("=== intakeテーブルで status = 'pending' の患者を調査 ===\n");

  // status = "pending" の患者を取得
  const { data: pendingPatients, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ クエリエラー:", error);
    return;
  }

  console.log(`総件数: ${pendingPatients?.length || 0} 件\n`);

  if (!pendingPatients || pendingPatients.length === 0) {
    console.log("✅ status = 'pending' の患者はいません");
    return;
  }

  console.log("【status = 'pending' の患者一覧】\n");

  pendingPatients.forEach((p, idx) => {
    console.log(`[${idx + 1}] patient_id: ${p.patient_id}`);
    console.log(`    patient_name: ${p.patient_name || "名前なし"}`);
    console.log(`    reserve_id: ${p.reserve_id || "予約なし"}`);
    console.log(`    reserved_date: ${p.reserved_date || "日付なし"}`);
    console.log(`    reserved_time: ${p.reserved_time || "時間なし"}`);
    console.log(`    created_at: ${p.created_at}`);
    console.log();
  });

  // 全体の status 分布も表示
  console.log("\n【全体のstatus分布】\n");

  const { data: allIntake } = await supabase
    .from("intake")
    .select("status");

  if (allIntake) {
    const statusCounts = {};
    allIntake.forEach(r => {
      const s = r.status === null ? "NULL" :
                r.status === "" ? "空文字列" :
                r.status;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 件`);
      });
  }

  console.log("\n【解決方法】");
  console.log("以下のSQLをSupabase Dashboardで実行してください:\n");
  console.log("UPDATE intake");
  console.log("SET status = NULL");
  console.log("WHERE status = 'pending';");
  console.log("");
  console.log(`実行後、${pendingPatients.length} 人の患者がカルテに表示されるようになります。`);
}

check();
