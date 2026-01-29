import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診送信の時系列確認 ===\n");

try {
  // 最新200件の作成日時を取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log("最新200件の作成日時:\n");

  let prevDate = null;
  let gaps = [];

  data.forEach((row, i) => {
    const created = new Date(row.created_at);
    const formatted = created.toLocaleString("ja-JP", { 
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    console.log((i + 1) + ". " + row.patient_id + " - " + formatted);

    if (prevDate) {
      const diffMs = prevDate - created;
      const diffMinutes = Math.floor(diffMs / 1000 / 60);
      
      // 1時間以上の間隔があれば記録
      if (diffMinutes > 60) {
        gaps.push({
          from: created,
          to: prevDate,
          minutes: diffMinutes
        });
      }
    }

    prevDate = created;
  });

  if (gaps.length > 0) {
    console.log("\n\n=== 1時間以上の送信間隔 ===");
    gaps.forEach((gap, i) => {
      const fromStr = gap.from.toLocaleString("ja-JP");
      const toStr = gap.to.toLocaleString("ja-JP");
      const hours = Math.floor(gap.minutes / 60);
      const mins = gap.minutes % 60;
      
      console.log("\n" + (i + 1) + ". " + hours + "時間" + mins + "分の間隔");
      console.log("   " + fromStr + " → " + toStr);
    });
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
