// scripts/check-today-intake.mjs
// Supabase intakeテーブルで今日の予約が何件あるか確認

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

const today = "2026-01-30";

console.log(`=== Supabase intakeテーブル 今日（${today}）の予約確認 ===\n`);

async function checkTodayIntake() {
  // 1. 今日のreserved_dateを持つintakeレコードを取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status")
    .eq("reserved_date", today)
    .order("reserved_time", { ascending: true });

  if (error) {
    console.log(`❌ Supabaseエラー: ${error.message}`);
    return;
  }

  console.log(`✅ Supabase intakeテーブル 今日の予約: ${data.length}件\n`);

  if (data.length === 0) {
    console.log("❌ intakeテーブルに今日の予約がありません");
    return;
  }

  // ステータス別の内訳
  const pending = data.filter(r => !r.status || r.status === "" || r.status === "pending");
  const ok = data.filter(r => r.status === "OK");
  const ng = data.filter(r => r.status === "NG");

  console.log("【内訳】");
  console.log(`  pending（診察前）: ${pending.length}件`);
  console.log(`  OK（診察完了）: ${ok.length}件`);
  console.log(`  NG: ${ng.length}件`);
  console.log();

  console.log("【pending一覧】");
  pending.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ${r.reserved_time} - ${r.patient_name} (${r.patient_id})`);
  });
}

checkTodayIntake();
