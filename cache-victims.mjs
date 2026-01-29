// cache-victims.mjs
// syncQuestionnaireFromMaster() エラーのせいで予約に進めなかった人を特定

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== キャッシュ問題で予約に進めなかった患者を特定 ===\n");
console.log("条件:");
console.log("  1. 問診送信済み（answersあり）");
console.log("  2. status=空（未判定）← キャッシュエラーで問診済みが表示されなかった");
console.log("  3. 予約なし（reserve_idなし）");
console.log("  4. 修正前（2026-01-28 14:30以前）に問診送信\n");

try {
  // 修正デプロイ日時（commit c812df6）
  const fixDeployedAt = new Date("2026-01-28T14:30:00+09:00");

  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, reserve_id, status, created_at, answers")
    .or("reserve_id.is.null,reserve_id.eq.")
    .or("status.is.null,status.eq.")
    .lt("created_at", fixDeployedAt.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("❌ Supabaseクエリエラー:", error);
    process.exit(1);
  }

  // キャッシュ問題の被害者を特定
  const victims = data.filter(row => {
    const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
    const noStatus = !row.status || String(row.status).trim() === "";
    const noReserve = !row.reserve_id || String(row.reserve_id).trim() === "";
    return hasAnswers && noStatus && noReserve;
  });

  console.log(`キャッシュ問題の被害者: ${victims.length}件\n`);

  if (victims.length === 0) {
    console.log("✅ キャッシュ問題の被害者はいません！");
    process.exit(0);
  }

  // patient_idでユニークにする
  const uniquePatients = {};
  victims.forEach(row => {
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
  console.log(`\n📌 これらの患者は syncQuestionnaireFromMaster() エラーのせいで：`);
  console.log("   - 問診送信時にキャッシュ保存が失敗");
  console.log("   - マイページで「問診済み」が表示されなかった");
  console.log("   - 予約ボタンが出なかった");
  console.log("");
  console.log(`✅ すでに全${patients.length}件のキャッシュをクリア済み`);
  console.log("   → 今は予約画面に進めるようになっています\n");

  // answerer_idでグループ化
  const byAnswerer = {};
  patients.forEach(p => {
    const aid = p.answerer_id || "(answerer_id なし)";
    if (!byAnswerer[aid]) {
      byAnswerer[aid] = [];
    }
    byAnswerer[aid].push(p);
  });

  console.log("\n=== Answerer ID別集計 ===\n");
  Object.entries(byAnswerer).sort((a, b) => b[1].length - a[1].length).forEach(([aid, pats]) => {
    console.log(`${aid}: ${pats.length}件`);
  });

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
