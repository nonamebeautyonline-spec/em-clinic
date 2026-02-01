// scripts/test-intake-insert.mjs
// 問診送信時と同じ条件でSupabase書き込みをテスト

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

// 20251200228のGASデータを使ってテスト
const testData = {
  patient_id: "TEST_" + Date.now(),
  patient_name: "テスト 太郎",
  answerer_id: null, // ★ これが問題の可能性
  line_id: null,
  reserve_id: null,
  reserved_date: null,
  reserved_time: null,
  status: null,
  note: null,
  prescription_menu: null,
  answers: {
    氏名: "テスト 太郎",
    name: "テスト 太郎"
  }
};

console.log("=== 問診送信時の書き込みテスト ===\n");
console.log("テストデータ:", JSON.stringify(testData, null, 2));

async function testInsert() {
  console.log("\n【テスト1】upsert（問診送信時と同じ）");
  
  const { data, error } = await supabase
    .from("intake")
    .upsert(testData, { onConflict: "patient_id" });

  if (error) {
    console.log("❌ 失敗:", error);
    console.log("\nエラー詳細:");
    console.log("  message:", error.message);
    console.log("  code:", error.code);
    console.log("  details:", error.details);
    console.log("  hint:", error.hint);
    
    // answerer_idが原因かテスト
    if (error.message.includes("answerer_id") || error.message.includes("null")) {
      console.log("\n【原因の可能性】answerer_idがnullで制約違反");
      
      // answerer_idをダミー値でテスト
      console.log("\n【テスト2】answerer_idにダミー値を設定");
      const testData2 = { ...testData, answerer_id: "dummy_12345" };
      const { error: error2 } = await supabase
        .from("intake")
        .upsert(testData2, { onConflict: "patient_id" });
      
      if (error2) {
        console.log("❌ まだ失敗:", error2.message);
      } else {
        console.log("✅ 成功！answerer_idがnullだと失敗する");
        await supabase.from("intake").delete().eq("patient_id", testData2.patient_id);
      }
    }
  } else {
    console.log("✅ 成功");
    await supabase.from("intake").delete().eq("patient_id", testData.patient_id);
  }
  
  // 20251200228のGAS実データで再現テスト
  console.log("\n【テスト3】実際の失敗データで再現");
  const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;
  const gasResponse = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  
  const gasData = await gasResponse.json();
  let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;
  const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === "20251200228");
  
  if (gasRecord) {
    console.log("GASデータ取得:", gasRecord.name);
    console.log("  answerer_id:", gasRecord.answerer_id || "NULL");
    console.log("  line_id:", gasRecord.line_id || "NULL");
    
    const realTestData = {
      patient_id: "TEST_REAL_" + Date.now(),
      patient_name: gasRecord.name || null,
      answerer_id: gasRecord.answerer_id || null,
      line_id: gasRecord.line_id || null,
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
      status: null,
      note: null,
      prescription_menu: null,
      answers: { 氏名: gasRecord.name || "" }
    };
    
    const { error: error3 } = await supabase
      .from("intake")
      .upsert(realTestData, { onConflict: "patient_id" });
    
    if (error3) {
      console.log("\n❌ 実データで失敗を再現:", error3.message);
      console.log("  これが問診送信時に失敗した原因です");
    } else {
      console.log("\n✅ 実データでは成功");
      await supabase.from("intake").delete().eq("patient_id", realTestData.patient_id);
    }
  }
}

testInsert();
