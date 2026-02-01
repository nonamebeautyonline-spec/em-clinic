// scripts/check-4patients-detail.mjs
// 直近4人のSupabase詳細状況確認

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

const targetPatients = ["20251200228", "20260101580", "20260101559", "20260101613"];

async function checkDetail() {
  console.log("=== 直近4人の詳細確認 ===\n");

  for (const pid of targetPatients) {
    console.log(`\n【patient_id: ${pid}】`);

    // 1. intake
    const { data: intake, error: intakeError } = await supabase
      .from("intake")
      .select("*")
      .eq("patient_id", pid)
      .maybeSingle();

    if (intakeError) {
      console.log("  ❌ intakeエラー:", intakeError.message);
    } else if (!intake) {
      console.log("  ❌ intakeレコードなし");
    } else {
      console.log("  ✅ intakeレコードあり");
      console.log(`      patient_name: ${intake.patient_name || "NULL"}`);
      console.log(`      reserve_id: ${intake.reserve_id || "NULL"}`);
      console.log(`      reserved_date: ${intake.reserved_date || "NULL"}`);
      console.log(`      reserved_time: ${intake.reserved_time || "NULL"}`);
      console.log(`      status: ${intake.status || "NULL"}`);
      console.log(`      created_at: ${intake.created_at}`);
    }

    // 2. reservations
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", pid)
      .order("created_at", { ascending: false });

    if (resError) {
      console.log("  ❌ reservationsエラー:", resError.message);
    } else if (!reservations || reservations.length === 0) {
      console.log("  ❌ reservationsレコードなし");
    } else {
      console.log(`  ✅ reservations: ${reservations.length}件`);
      reservations.forEach((r, idx) => {
        console.log(`      [${idx + 1}] reserve_id: ${r.reserve_id}`);
        console.log(`          date/time: ${r.reserved_date} ${r.reserved_time}`);
        console.log(`          status: ${r.status}`);
        console.log(`          created_at: ${r.created_at}`);
      });
    }

    // 3. answerers
    const { data: answerer, error: ansError } = await supabase
      .from("answerers")
      .select("*")
      .eq("patient_id", pid)
      .maybeSingle();

    if (ansError) {
      console.log("  ❌ answerersエラー:", ansError.message);
    } else if (!answerer) {
      console.log("  ❌ answerersレコードなし");
    } else {
      console.log("  ✅ answerersレコードあり");
      console.log(`      name: ${answerer.name || "NULL"}`);
      console.log(`      name_kana: ${answerer.name_kana || "NULL"}`);
    }

    console.log();
  }

  console.log("\n【分析】");
  console.log("- intakeレコードがあるのに予約が表示されない場合:");
  console.log("  1. intake.reserve_id が NULL → 予約情報が未連携");
  console.log("  2. reservations テーブルにレコードなし → 予約が作成されていない");
  console.log("  3. キャッシュ問題 → キャッシュクリアで解決");
}

checkDetail();
