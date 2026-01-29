import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientId = "20260101385";

console.log("=== Patient ID " + patientId + " の確認 ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log("件数: " + data.length + "件\n");

  if (data.length === 0) {
    console.log("❌ このpatient_idは存在しません");
  } else if (data.length === 1) {
    console.log("✅ 正常（1件のみ）\n");
    const row = data[0];
    console.log("patient_id: " + row.patient_id);
    console.log("patient_name: " + (row.patient_name || "(なし)"));
    console.log("answerer_id: " + (row.answerer_id || "(なし)"));
    console.log("created_at: " + row.created_at);
    console.log("updated_at: " + (row.updated_at || "(なし)"));
  } else {
    console.log("⚠️  重複（" + data.length + "件）\n");
    data.forEach((row, i) => {
      console.log((i + 1) + "件目:");
      console.log("  patient_id: " + row.patient_id);
      console.log("  patient_name: " + (row.patient_name || "(なし)"));
      console.log("  answerer_id: " + (row.answerer_id || "(なし)"));
      console.log("  created_at: " + row.created_at);
      console.log("  updated_at: " + (row.updated_at || "(なし)"));
      console.log("");
    });
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
