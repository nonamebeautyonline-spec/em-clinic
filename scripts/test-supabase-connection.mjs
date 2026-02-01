// scripts/test-supabase-connection.mjs
// Supabase接続とupsert動作をテスト

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

console.log("=== Supabase接続テスト ===\n");
console.log("URL:", envVars.NEXT_PUBLIC_SUPABASE_URL);
console.log("ANON_KEY (最初10文字):", envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + "...\n");

async function testConnection() {
  // 1. SELECT テスト
  console.log("【テスト1】SELECT クエリ");
  const { data: selectData, error: selectError } = await supabase
    .from("intake")
    .select("patient_id")
    .limit(1);

  if (selectError) {
    console.log("  ❌ SELECT エラー:", selectError.message);
    console.log("  → Supabase接続に問題があります");
    return;
  } else {
    console.log("  ✅ SELECT 成功:", selectData?.length || 0, "件");
  }

  // 2. UPSERT テスト（テストデータ）
  console.log("\n【テスト2】UPSERT クエリ");
  const testPid = "TEST_CONNECTION_" + Date.now();

  const { data: upsertData, error: upsertError } = await supabase
    .from("intake")
    .upsert({
      patient_id: testPid,
      patient_name: "テスト患者",
      answerer_id: null,
      line_id: null,
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
      status: null,
      note: null,
      prescription_menu: null,
      answers: { test: true },
    }, {
      onConflict: "patient_id",
    });

  if (upsertError) {
    console.log("  ❌ UPSERT エラー:", upsertError.message);
    console.log("  code:", upsertError.code);
    console.log("  details:", upsertError.details);
    console.log("  → これがintake書き込みが失敗している原因の可能性");
  } else {
    console.log("  ✅ UPSERT 成功");
    console.log("  data:", upsertData);
  }

  // 3. 確認
  console.log("\n【テスト3】挿入データ確認");
  const { data: checkData, error: checkError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", testPid)
    .maybeSingle();

  if (checkError) {
    console.log("  ❌ SELECT エラー:", checkError.message);
  } else if (checkData) {
    console.log("  ✅ データ確認成功");
    console.log("  patient_id:", checkData.patient_id);
    console.log("  patient_name:", checkData.patient_name);
  } else {
    console.log("  ❌ データが見つかりません（UPSERTは成功したのに...）");
  }

  // 4. クリーンアップ
  console.log("\n【テスト4】クリーンアップ");
  const { error: deleteError } = await supabase
    .from("intake")
    .delete()
    .eq("patient_id", testPid);

  if (deleteError) {
    console.log("  ❌ DELETE エラー:", deleteError.message);
    console.log("  → RLS (Row Level Security) の問題かもしれません");
  } else {
    console.log("  ✅ DELETE 成功");
  }
}

testConnection();
