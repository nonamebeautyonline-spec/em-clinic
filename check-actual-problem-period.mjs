// check-actual-problem-period.mjs
// Supabase統合後、修正前の実際の問題期間を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 実際の問題期間の確認 ===\n");

try {
  // Supabase統合追加: 2026-01-26 19:01:58 JST = 2026-01-26 10:01:58 UTC
  // 修正デプロイ: 2026-01-28 14:51:00 JST = 2026-01-28 05:51:00 UTC
  // 最初の正常同期: 20260101477 at 2026-01-27 07:54:40 JST = 2026-01-26 22:54:40 UTC

  console.log("期間:");
  console.log("  Supabase統合追加: 2026-01-26 19:01 JST");
  console.log("  最初の正常同期: 2026-01-27 07:54 JST (patient_id: 20260101477)");
  console.log("  修正デプロイ: 2026-01-28 14:51 JST");
  console.log("");

  // この期間に作成されたレコード（バックフィル時間を除く）
  const { data: problemPeriodData, error: error1 } = await supabase
    .from("intake")
    .select("patient_id, created_at, patient_name")
    .gte("created_at", "2026-01-26T10:02:00Z")  // 統合直後から
    .lt("created_at", "2026-01-26T22:54:40Z")   // 最初の正常同期まで
    .order("created_at", { ascending: true });

  if (error1) {
    console.error("❌ クエリエラー:", error1);
    process.exit(1);
  }

  console.log(`\n問題期間（2026-01-26 19:01 ～ 2026-01-27 07:54）に作成されたレコード: ${problemPeriodData.length}件\n`);

  if (problemPeriodData.length > 0) {
    console.log("Patient ID\t作成日時（JST）\t\t氏名");
    console.log("=".repeat(80));

    problemPeriodData.forEach(row => {
      const createdJST = new Date(row.created_at).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const name = row.patient_name || "(なし)";
      console.log(`${row.patient_id}\t${createdJST}\t${name}`);
    });

    // 氏名なしの件数
    const noNameCount = problemPeriodData.filter(r => !r.patient_name).length;
    console.log(`\n氏名なし: ${noNameCount}件 / ${problemPeriodData.length}件`);
  }

  // 正常同期期間のレコード（比較用）
  const { data: normalData, error: error2 } = await supabase
    .from("intake")
    .select("patient_id, created_at, patient_name")
    .gte("created_at", "2026-01-26T22:54:40Z")  // 最初の正常同期から
    .lt("created_at", "2026-01-28T06:30:00Z")   // バックフィル開始まで
    .order("created_at", { ascending: true });

  if (error2) {
    console.error("❌ クエリエラー:", error2);
    process.exit(1);
  }

  console.log(`\n\n正常同期期間（2026-01-27 07:54 ～ 2026-01-28 15:30）に作成されたレコード: ${normalData.length}件\n`);

  if (normalData.length > 0) {
    const noNameCount = normalData.filter(r => !r.patient_name).length;
    console.log(`氏名なし: ${noNameCount}件 / ${normalData.length}件`);

    // 最初の10件を表示
    console.log("\n最初の10件:");
    normalData.slice(0, 10).forEach(row => {
      const createdJST = new Date(row.created_at).toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const name = row.patient_name || "(なし)";
      console.log(`  ${row.patient_id}\t${createdJST}\t${name}`);
    });
  }

  console.log("\n\n=== 結論 ===\n");
  console.log("実際の問題期間: 2026-01-26 19:01 ～ 2026-01-27 07:54（約12-13時間）");
  console.log(`影響を受けた患者数: ${problemPeriodData.length}名`);
  console.log("\nこれらの患者は:");
  console.log("  • Google Sheetsには問診が記録された");
  console.log("  • Supabaseには同期されたが、patient_name が null だった");
  console.log("  • マイページに反映されず、予約に進めなかった");
  console.log("\n566名のバックフィルは:");
  console.log("  • Supabase統合前（2025年12月～2026年1月26日19時）のデータ");
  console.log("  • 過去の問診データをSupabaseに補完しただけ");

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
