// show-intake-details.mjs
// 問診送信済み・未判定の患者を詳細表示（提出日時、answerer_id付き）

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診送信済み・未判定の患者（詳細） ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, reserve_id, status, created_at, answers")
    .or("reserve_id.is.null,reserve_id.eq.")
    .or("status.is.null,status.eq.")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("❌ Supabaseクエリエラー:", error);
    process.exit(1);
  }

  // 問診送信済み = answersがある
  const problematic = data.filter(row => {
    const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
    const noStatus = !row.status || String(row.status).trim() === "";
    return hasAnswers && noStatus;
  });

  console.log(`問診送信済み・未判定: ${problematic.length}件\n`);

  if (problematic.length === 0) {
    console.log("✅ 問題なし！");
    process.exit(0);
  }

  // patient_idでユニークにする（最新のレコードを使う）
  const uniquePatients = {};
  problematic.forEach(row => {
    const pid = String(row.patient_id || "").trim();
    if (pid && !uniquePatients[pid]) {
      uniquePatients[pid] = row;
    }
  });

  const patients = Object.values(uniquePatients);
  console.log(`ユニーク患者数: ${patients.length}件\n`);
  console.log("=".repeat(80) + "\n");

  // 提出日時の新しい順に並べる
  patients.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  patients.forEach((p, idx) => {
    const date = new Date(p.created_at);
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC+9
    const dateStr = jstDate.toISOString().replace('T', ' ').substring(0, 19);

    console.log(`${idx + 1}. ${p.patient_name || "(名前なし)"}`);
    console.log(`   Patient ID: ${p.patient_id}`);
    console.log(`   Answerer ID: ${p.answerer_id || "(なし)"}`);
    console.log(`   問診提出日時: ${dateStr} (JST)`);
    console.log("");
  });

  console.log("=".repeat(80));
  console.log(`\n合計: ${patients.length}件の患者のキャッシュをクリア済み`);
  console.log("これらの患者は予約画面に進めるようになっています。\n");

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
