import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 最新の患者データをSupabaseで確認 ===\n");

try {
  // 最新20件を取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log("最新20件:\n");
  console.log("Patient ID\t氏名\t\t\tAnswerer ID\tCreated At");
  console.log("=".repeat(100));

  data.forEach((row, i) => {
    const name = row.patient_name || "(なし)";
    const namePadding = name.length < 8 ? "\t\t" : "\t";
    const answererId = row.answerer_id || "(なし)";
    const created = new Date(row.created_at).toLocaleString("ja-JP");

    console.log(row.patient_id + "\t" + name + namePadding + answererId + "\t" + created);
  });

  // 特定のpatient_idをチェック
  console.log("\n\n=== 特定患者の確認 ===");
  const testIds = ["20260101544", "20260101545", "20260101546"];

  for (const pid of testIds) {
    const { data: checkData, error: checkError } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answerer_id, created_at")
      .eq("patient_id", pid);

    if (checkError) {
      console.log("\n" + pid + ": ❌ クエリエラー");
    } else if (!checkData || checkData.length === 0) {
      console.log("\n" + pid + ": ❌ Supabaseに存在しません");
    } else {
      const row = checkData[0];
      console.log("\n" + pid + ": ✅ 存在します");
      console.log("  氏名: " + (row.patient_name || "(なし)"));
      console.log("  answerer_id: " + (row.answerer_id || "(なし)"));
      console.log("  created_at: " + new Date(row.created_at).toLocaleString("ja-JP"));
    }
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
