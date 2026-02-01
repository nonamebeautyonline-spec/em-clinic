// scripts/test-supabase-error-format.mjs
// Supabaseエラーの形式を調査

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log("=== Supabaseエラー形式の調査 ===\n");

async function testErrorFormat() {
  // テスト1: 存在しないテーブル
  console.log("【テスト1】存在しないテーブルにinsert");
  const result1 = await supabase.from("nonexistent_table").insert({ id: 1 });
  console.log("  status:", result1.status);
  console.log("  error:", result1.error);
  console.log("  data:", result1.data);
  console.log("  result keys:", Object.keys(result1));
  console.log();

  // テスト2: 制約違反（patient_idが重複）
  console.log("【テスト2】重複キー制約違反");
  const testPid = "TEST_" + Date.now();
  await supabase.from("intake").insert({ patient_id: testPid, answers: {} });
  const result2 = await supabase.from("intake").insert({ patient_id: testPid, answers: {} });
  console.log("  status:", result2.status);
  console.log("  error:", result2.error);
  console.log("  data:", result2.data);
  console.log("  result keys:", Object.keys(result2));
  await supabase.from("intake").delete().eq("patient_id", testPid);
  console.log();

  // テスト3: upsertの結果
  console.log("【テスト3】upsert成功時");
  const testPid2 = "TEST_" + Date.now();
  const result3 = await supabase.from("intake").upsert({ patient_id: testPid2, answers: {} }, { onConflict: "patient_id" });
  console.log("  status:", result3.status);
  console.log("  error:", result3.error);
  console.log("  data:", result3.data);
  console.log("  result keys:", Object.keys(result3));
  await supabase.from("intake").delete().eq("patient_id", testPid2);
  console.log();

  // テスト4: Promise.allSettledでの挙動
  console.log("【テスト4】Promise.allSettledでのエラー");
  const [result4] = await Promise.allSettled([
    supabase.from("nonexistent_table").insert({ id: 1 })
  ]);
  console.log("  allSettled status:", result4.status);
  if (result4.status === "fulfilled") {
    console.log("  value:", result4.value);
    console.log("  value.error:", result4.value.error);
    console.log("  value.data:", result4.value.data);
  } else {
    console.log("  reason:", result4.reason);
  }
}

testErrorFormat();
