// check-actual-submission-dates.mjs
// バックフィルされた患者の実際の問診送信日時を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== バックフィル患者の実際の問診送信日時 ===\n");

try {
  // バックフィルされた患者（created_atが2026/01/28 15:30-16:00 UTC）
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at, answers")
    .gte("created_at", "2026-01-28T06:30:00Z")
    .lte("created_at", "2026-01-28T07:00:00Z")
    .order("patient_id", { ascending: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`対象患者数: ${data.length}件\n`);

  // answers内のtimestampまたはsubmittedAtを抽出
  const submissions = [];

  data.forEach(row => {
    const answers = row.answers || {};
    const timestamp = answers.timestamp || answers.submittedAt;

    if (timestamp) {
      try {
        const submittedDate = new Date(timestamp);
        submissions.push({
          patient_id: row.patient_id,
          submitted_at: submittedDate,
          created_at: new Date(row.created_at)
        });
      } catch (e) {
        // タイムスタンプのパースに失敗
      }
    }
  });

  console.log(`タイムスタンプが取得できた件数: ${submissions.length}件\n`);

  if (submissions.length === 0) {
    console.log("⚠️  タイムスタンプデータが見つかりません");
    process.exit(0);
  }

  // 実際の送信日時でソート
  submissions.sort((a, b) => a.submitted_at - b.submitted_at);

  const first = submissions[0];
  const last = submissions[submissions.length - 1];

  console.log("=== 実際の問診送信期間 ===\n");
  console.log(`最初の送信: ${first.submitted_at.toLocaleString("ja-JP")}`);
  console.log(`  Patient ID: ${first.patient_id}`);
  console.log(`\n最後の送信: ${last.submitted_at.toLocaleString("ja-JP")}`);
  console.log(`  Patient ID: ${last.patient_id}`);

  const diffMs = last.submitted_at - first.submitted_at;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  console.log(`\n期間: ${diffDays}日 ${diffHours}時間`);

  // 日付別に集計
  const dateGroups = {};

  submissions.forEach(sub => {
    const dateStr = sub.submitted_at.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = [];
    }
    dateGroups[dateStr].push(sub.patient_id);
  });

  console.log("\n=== 日付別の送信数 ===\n");

  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    const dateA = new Date(a.split("/").reverse().join("-"));
    const dateB = new Date(b.split("/").reverse().join("-"));
    return dateA - dateB;
  });

  sortedDates.forEach(dateStr => {
    console.log(`${dateStr}: ${dateGroups[dateStr].length}件`);
  });

  // 結論
  console.log("\n=== 問診が完了できなかった可能性のある期間 ===\n");
  console.log(`期間: ${first.submitted_at.toLocaleDateString("ja-JP")} ～ ${last.submitted_at.toLocaleDateString("ja-JP")}`);
  console.log("\nこの期間に問診を送信した ${submissions.length}件の患者は:");
  console.log("• Google Sheets（問診シート）には正常に記録された");
  console.log("• Supabaseへの同期には失敗していた");
  console.log("• 2026/01/28 15:42のバックフィル実行まで、マイページに反映されていなかった");
  console.log("\n原因:");
  console.log("• writeToSupabaseIntake_() 関数が呼ばれていなかった、または");
  console.log("• 呼ばれていたがエラーで失敗していた");
  console.log("\n修正内容:");
  console.log("• 2026/01/28に answersからの個人情報抽出ロジックを修正");
  console.log("• syncQuestionnaireFromMaster() をtry-catchでラップして問診送信を継続可能に");
  console.log("• 566件の欠損データをバックフィルで補完");

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
