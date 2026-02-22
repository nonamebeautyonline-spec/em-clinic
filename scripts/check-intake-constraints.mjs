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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// まずintakeの件数とpatient_id重複状況を確認
const { count: totalIntake } = await supabase.from("intake").select("id", { count: "exact", head: true });
console.log("intake全件:", totalIntake);

// patient_idでグループして重複確認
const { data: dupes } = await supabase.from("intake").select("patient_id").not("patient_id", "is", null).limit(5000);
const pidCounts = {};
for (const d of dupes || []) {
  pidCounts[d.patient_id] = (pidCounts[d.patient_id] || 0) + 1;
}
const multiIntake = Object.entries(pidCounts).filter(([, c]) => c > 1);
console.log("複数intakeを持つ患者数:", multiIntake.length);
if (multiIntake.length > 0) {
  console.log("サンプル:", multiIntake.slice(0, 5));
}

// supabaseAdminでinsert（onConflict確認）
const testResult = await supabase.from("intake").insert({
  patient_id: "TEST_CONSTRAINT_CHECK_999",
  patient_name: "テスト",
  note: "制約テスト",
  created_at: new Date().toISOString(),
}).select();

console.log("\nテストinsert結果:", testResult.error ? testResult.error.message : "OK");

// テストデータ削除
if (!testResult.error) {
  await supabase.from("intake").delete().eq("patient_id", "TEST_CONSTRAINT_CHECK_999");

  // 2件目のinsert
  const test2 = await supabase.from("intake").insert({
    patient_id: "TEST_CONSTRAINT_CHECK_999",
    patient_name: "テスト",
    note: "制約テスト2",
    created_at: new Date().toISOString(),
  }).select();
  console.log("2件目insert結果:", test2.error ? test2.error.message : "OK");

  if (!test2.error) {
    // 3件目
    const test3 = await supabase.from("intake").insert({
      patient_id: "TEST_CONSTRAINT_CHECK_999",
      patient_name: "テスト",
      note: "制約テスト3",
      created_at: new Date().toISOString(),
    }).select();
    console.log("3件目insert結果:", test3.error ? test3.error.message : "OK");

    // 後始末
    await supabase.from("intake").delete().eq("patient_id", "TEST_CONSTRAINT_CHECK_999");
  } else {
    await supabase.from("intake").delete().eq("patient_id", "TEST_CONSTRAINT_CHECK_999");
  }
}
