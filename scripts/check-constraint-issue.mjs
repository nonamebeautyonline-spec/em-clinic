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

console.log("=== CHECK制約の問題調査 ===\n");

// テスト1: status = NULL でinsert
console.log("テスト1: status = NULL でinsert");
const testPid1 = "TEST_" + Date.now();

const { error: test1Error } = await supabase
  .from("intake")
  .insert({
    patient_id: testPid1,
    patient_name: "テスト1",
    status: null,
    answers: {}
  });

if (test1Error) {
  console.log("  ❌ 失敗:", test1Error.message);
} else {
  console.log("  ✅ 成功");
  await supabase.from("intake").delete().eq("patient_id", testPid1);
}

// テスト2: statusを指定しない（デフォルトNULL）
console.log("\nテスト2: statusを指定しない");
const testPid2 = "TEST_" + (Date.now() + 1);

const { error: test2Error } = await supabase
  .from("intake")
  .insert({
    patient_id: testPid2,
    patient_name: "テスト2",
    answers: {}
  });

if (test2Error) {
  console.log("  ❌ 失敗:", test2Error.message);
  console.log("\n原因: CHECK制約がデフォルト値を拒否している可能性");
  console.log("修正: Supabase Dashboardで制約を削除:");
  console.log("  ALTER TABLE intake DROP CONSTRAINT intake_status_check;");
} else {
  console.log("  ✅ 成功");
  await supabase.from("intake").delete().eq("patient_id", testPid2);
}

// テスト3: upsert with status = null
console.log("\nテスト3: upsert with status = null");
const testPid3 = "TEST_" + (Date.now() + 2);

const { error: test3Error } = await supabase
  .from("intake")
  .upsert({
    patient_id: testPid3,
    patient_name: "テスト3",
    status: null,
    answers: {}
  }, { onConflict: "patient_id" });

if (test3Error) {
  console.log("  ❌ 失敗:", test3Error.message);
} else {
  console.log("  ✅ 成功");
  await supabase.from("intake").delete().eq("patient_id", testPid3);
}

console.log("\n=== 結論 ===");
console.log("全てのテストが成功すれば、CHECK制約は正常です。");
console.log("いずれかが失敗すれば、CHECK制約を削除する必要があります。");
