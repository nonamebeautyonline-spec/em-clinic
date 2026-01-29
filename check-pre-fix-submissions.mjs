// check-pre-fix-submissions.mjs
// 修正前の期間に問診送信された患者を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 修正前の期間に問診送信された患者 ===\n");

try {
  // 最初の正常同期: 20260101477 (2026/01/27 07:54:40)
  // それより前の patient_id で、created_at が問題期間のもの

  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at, patient_name")
    .lt("patient_id", "20260101477")
    .gte("created_at", "2026-01-26T10:00:00Z")  // 2026-01-26 19:00 JST
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`修正前の期間に作成されたレコード: ${data.length}件\n`);

  if (data.length === 0) {
    console.log("該当するレコードがありません。");
    console.log("\n考えられる理由:");
    console.log("1. この期間に問診送信がなかった");
    console.log("2. 問診送信に失敗して、Google Sheetsにも記録されなかった");
    console.log("3. 記録されたがSupabase同期に完全に失敗した");
    process.exit(0);
  }

  // created_at の分布を確認
  console.log("=== created_at の分布 ===\n");

  const byHour = {};

  data.forEach(row => {
    const created = new Date(row.created_at);
    const hour = created.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    if (!byHour[hour]) {
      byHour[hour] = [];
    }
    byHour[hour].push(row);
  });

  Object.keys(byHour).sort().forEach(hour => {
    const count = byHour[hour].length;
    const noNameCount = byHour[hour].filter(r => !r.patient_name).length;
    console.log(`${hour}: ${count}件（氏名なし: ${noNameCount}件）`);
  });

  // 全レコード表示
  console.log("\n=== 全レコード ===\n");
  console.log("Patient ID\t作成日時（JST）\t\t氏名");
  console.log("=".repeat(80));

  data.forEach(row => {
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

  const noNameCount = data.filter(r => !r.patient_name).length;
  console.log(`\n氏名なし: ${noNameCount}件 / ${data.length}件`);

  console.log("\n\n=== 結論 ===\n");
  console.log(`Supabase統合後、修正前の期間（2026-01-26 19:00 ～ 2026-01-27 07:54）:  ${data.length}名`);

  if (noNameCount > 0) {
    console.log(`うち氏名なし: ${noNameCount}名`);
    console.log("\nこれらの患者は body.name が取れず、patient_name: null で同期されました。");
    console.log("その後 fix-missing-names.js で補完された可能性があります。");
  } else {
    console.log("全員に氏名があります（バックフィルまたは補完済み）。");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
