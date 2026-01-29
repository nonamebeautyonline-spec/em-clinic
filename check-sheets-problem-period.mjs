// check-sheets-problem-period.mjs
// Google Sheetsから問題期間の実際の問診送信を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問題期間の実際の問診送信（Supabase created_at ベース）===\n");

try {
  // リアルタイムで同期されたレコード（created_atが実際の送信時刻と一致）
  // バックフィルを除外するため、patient_idが2026で始まるものに限定
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at, patient_name, answers")
    .gte("patient_id", "20260126000")
    .lt("patient_id", "20260128000")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`2026年1月26-27日の全患者: ${data.length}名\n`);

  // created_atでグループ化
  const byCreatedDate = {};

  data.forEach(row => {
    const created = new Date(row.created_at);
    const dateStr = created.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit"
    });

    if (!byCreatedDate[dateStr]) {
      byCreatedDate[dateStr] = [];
    }
    byCreatedDate[dateStr].push(row);
  });

  console.log("=== 時間帯別の作成件数 ===\n");

  const sortedDates = Object.keys(byCreatedDate).sort();

  sortedDates.forEach(dateStr => {
    const count = byCreatedDate[dateStr].length;
    const noNameCount = byCreatedDate[dateStr].filter(r => !r.patient_name).length;
    console.log(`${dateStr}時台: ${count}件（氏名なし: ${noNameCount}件）`);
  });

  // 問題期間のレコードを抽出（バックフィル時刻以外）
  const problemRecords = data.filter(row => {
    const created = new Date(row.created_at);
    const jst = new Date(created.getTime() + 9 * 60 * 60 * 1000);

    // バックフィル時刻（2026-01-27 00:41:49 JST）を除外
    const isBackfill = jst.toISOString().startsWith("2026-01-27T00:41:");

    // Supabase統合後（2026-01-26 19:01 JST）～ 最初の正常同期前（2026-01-27 07:54 JST）
    const integrationStart = new Date("2026-01-26T10:01:00Z"); // JST 19:01
    const firstNormalSync = new Date("2026-01-26T22:54:40Z");  // JST 07:54

    return !isBackfill && created >= integrationStart && created < firstNormalSync;
  });

  console.log(`\n\n=== 問題期間（バックフィル除外）のリアルタイム送信 ===\n`);
  console.log(`件数: ${problemRecords.length}名\n`);

  if (problemRecords.length > 0) {
    console.log("Patient ID\t作成日時（JST）\t\t氏名");
    console.log("=".repeat(80));

    problemRecords.forEach(row => {
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

    const noNameCount = problemRecords.filter(r => !r.patient_name).length;
    console.log(`\n氏名なし: ${noNameCount}件 / ${problemRecords.length}件`);
  }

  console.log("\n\n=== 結論 ===\n");
  console.log(`実際の問題期間に問診送信した患者: ${problemRecords.length}名`);

  if (problemRecords.length > 0) {
    const noNameCount = problemRecords.filter(r => !r.patient_name).length;
    if (noNameCount > 0) {
      console.log(`うち氏名が null だった: ${noNameCount}名`);
      console.log("\nこれらの患者は:");
      console.log("  • 問診送信時に body.name が取れなかった");
      console.log("  • patient_name: null でSupabaseに同期された");
      console.log("  • マイページに反映されず、予約に進めなかった可能性");
    } else {
      console.log("全員に氏名があります（修正済み、またはバックフィルで補完済み）");
    }
  } else {
    console.log("この期間にリアルタイムで問診送信した患者はいません");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
