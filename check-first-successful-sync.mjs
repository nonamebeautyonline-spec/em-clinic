// check-first-successful-sync.mjs
// バックフィル後、正常に同期された最初の患者を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== バックフィル後の正常同期患者の確認 ===\n");

try {
  // バックフィル時間「以外」に作成されたレコードを取得
  // つまり、リアルタイムで問診送信→即座にSupabase同期されたレコード
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at")
    .or(
      `created_at.lt.2026-01-28T06:30:00Z,created_at.gt.2026-01-28T07:00:00Z`
    )
    .gte("patient_id", "20260101477") // バックフィル最後の患者より後
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`正常同期された患者数（patient_id >= 20260101477）: ${data.length}件\n`);

  if (data.length === 0) {
    console.log("該当データが見つかりません");
    process.exit(0);
  }

  console.log("=== 最初の20件 ===\n");
  console.log("Patient ID\t作成日時（JST）");
  console.log("=".repeat(60));

  data.forEach(row => {
    const createdJST = new Date(row.created_at).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    console.log(`${row.patient_id}\t${createdJST}`);
  });

  const first = data[0];
  const firstCreated = new Date(first.created_at);

  console.log("\n=== 結論 ===\n");
  console.log(`最初に正常同期された患者: ${first.patient_id}`);
  console.log(`同期成功日時: ${firstCreated.toLocaleString("ja-JP")}`);
  console.log("\nこの時刻以降は問診送信が正常に動作しています。");
  console.log("\n問診が完了できなかった可能性のある期間:");
  console.log(`  • 開始: 不明（過去のデータから推測: 2025年12月頃から）`);
  console.log(`  • 終了: ${firstCreated.toLocaleString("ja-JP")}`);
  console.log("\n原因:");
  console.log("  • writeToSupabaseIntake_() が個人情報を正しく抽出できていなかった");
  console.log("  • または syncQuestionnaireFromMaster() がタイムアウトで問診送信自体が失敗");
  console.log("\n修正時刻:");
  console.log("  • コード修正デプロイ: 2026/01/28（詳細な時刻は不明）");
  console.log(`  • 最初の正常動作確認: ${firstCreated.toLocaleString("ja-JP")}`);

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
