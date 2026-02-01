// scripts/check-recent-missing-intake.mjs
// 最近の問診データでGASにあってSupabaseにないものを検出

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

async function checkRecent() {
  console.log("=== 最近の問診データ差分チェック ===\n");

  // 1. GASから全問診データ取得
  console.log("1. GASから問診データ取得中...");
  const gasResponse = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!gasResponse.ok) {
    console.log("❌ GAS API Error:", gasResponse.status);
    return;
  }

  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;
  console.log(`✅ GASデータ: ${gasRows.length} 件\n`);

  // 2. Supabaseから全intakeデータ取得
  console.log("2. Supabaseからintakeデータ取得中...");
  const { data: supabaseIntakes, error } = await supabase
    .from("intake")
    .select("patient_id, created_at, reserved_date, reserved_time")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("❌ Supabase Error:", error.message);
    return;
  }

  console.log(`✅ Supabaseデータ: ${supabaseIntakes.length} 件\n`);

  // 3. patient_idのSetを作成
  const supabasePids = new Set(supabaseIntakes.map(r => r.patient_id));

  // 4. GASにあってSupabaseにないレコードを検出（最近7日間）
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const missing = gasRows.filter(r => {
    const pid = String(r.patient_id || "").trim();
    if (!pid || supabasePids.has(pid)) return false;

    // submittedAt または timestamp をチェック
    const submittedAt = r.submittedAt || r.timestamp;
    if (!submittedAt) return false;

    const submittedDate = new Date(submittedAt);
    return submittedDate >= sevenDaysAgo;
  });

  console.log("=== 結果 ===\n");
  console.log(`📊 GASにあってSupabaseにない（直近7日間）: ${missing.length} 件\n`);

  if (missing.length === 0) {
    console.log("✅ 問題なし：すべての問診データがSupabaseに同期されています");
  } else {
    console.log("❌ 以下の患者の問診データがSupabaseに入っていません:\n");

    missing.sort((a, b) => {
      const aTime = new Date(a.submittedAt || a.timestamp);
      const bTime = new Date(b.submittedAt || b.timestamp);
      return bTime - aTime; // 新しい順
    });

    missing.forEach((r, idx) => {
      console.log(`[${idx + 1}] patient_id: ${r.patient_id}`);
      console.log(`    氏名: ${r.name || r.patient_name || "不明"}`);
      console.log(`    問診送信日時: ${r.submittedAt || r.timestamp || "不明"}`);
      console.log(`    reserve_id: ${r.reserveId || r.reserved || "なし"}`);
      console.log(`    reserved_date: ${r.reserved_date || "なし"}`);
      console.log(`    reserved_time: ${r.reserved_time || "なし"}`);
      console.log();
    });

    console.log("【対応】");
    console.log("sync-missing-intake-from-gas.mjs の targetPatients を以下に更新してください:");
    const pids = missing.map(r => `"${r.patient_id}"`).join(", ");
    console.log(`const targetPatients = [${pids}];`);
  }
}

checkRecent();
