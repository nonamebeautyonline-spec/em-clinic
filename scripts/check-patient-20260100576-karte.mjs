// scripts/check-patient-20260100576-karte.mjs
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

async function checkKarteVisibility() {
  const patientId = "20260100576";

  console.log("=== patient_id: 20260100576 (土屋雅裕) カルテ表示確認 ===\n");

  // intake確認
  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log("1. intake テーブル:");
  if (intake) {
    console.log(`  ✅ 存在: id=${intake.id}`);
    console.log(`  patient_name: ${intake.patient_name || "なし"}`);
    console.log(`  reserve_id: ${intake.reserve_id || "なし"}`);
    console.log(`  reserved_date: ${intake.reserved_date || "なし"}`);
    console.log(`  status: ${intake.status || "なし"}`);
    console.log(`  answers.sex: ${intake.answers?.sex || "なし"}`);
    console.log(`  answers.birth: ${intake.answers?.birth || "なし"}`);
    console.log(`  answers.tel: ${intake.answers?.tel || "なし"}`);
    console.log(`  created_at: ${intake.created_at}`);
  } else {
    console.log("  ❌ データなし");
  }

  // reservations確認
  const { data: reservations, count } = await supabase
    .from("reservations")
    .select("*", { count: "exact" })
    .eq("patient_id", patientId)
    .order("reserved_date", { ascending: true });

  console.log(`\n2. reservations テーブル: ${count} 件`);
  if (reservations && reservations.length > 0) {
    reservations.forEach((r, idx) => {
      console.log(`  [${idx + 1}] reserve_id: ${r.reserve_id}`);
      console.log(`      reserved_date: ${r.reserved_date}`);
      console.log(`      status: ${r.status || "なし"}`);
    });
  }

  // answerers確認
  const { data: answerer } = await supabase
    .from("answerers")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  console.log("\n3. answerers テーブル:");
  if (answerer) {
    console.log(`  ✅ 存在`);
    console.log(`  name: ${answerer.name || "なし"}`);
    console.log(`  sex: ${answerer.sex || "なし"}`);
    console.log(`  birthday: ${answerer.birthday || "なし"}`);
    console.log(`  tel: ${answerer.tel || "なし"}`);
  } else {
    console.log("  ❌ データなし");
  }

  console.log("\n【カルテ表示に必要な条件】");
  console.log("- intakeテーブルに存在: " + (intake ? "✅" : "❌"));
  console.log("- reserve_idあり: " + (intake?.reserve_id ? "✅" : "❌"));
  console.log("- reserved_dateあり: " + (intake?.reserved_date ? "✅" : "❌"));
  console.log("- 基本情報（sex, birth, tel）: " + (intake?.answers?.sex && intake?.answers?.birth && intake?.answers?.tel ? "✅" : "❌"));
}

checkKarteVisibility();
