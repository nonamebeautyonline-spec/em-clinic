// check-empty-name-detail.mjs
// 氏名が空のレコードの詳細を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const patientId = "20260101532";

console.log(`=== Checking patient_id: ${patientId} ===\n`);

try {
  // 1. intakeテーブルのレコード
  const { data: intakeData } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  console.log("=== intake table ===");
  console.log(JSON.stringify(intakeData, null, 2));

  // 2. reservationsテーブルにレコードがあるか
  const { data: resData } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId);

  console.log("\n=== reservations table ===");
  console.log(`Found ${resData?.length || 0} records`);
  if (resData && resData.length > 0) {
    console.log(JSON.stringify(resData, null, 2));
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
