// list-cache-victims-formatted.mjs
// キャッシュ被害者19人を answerer_id | 氏名 | PID 形式で出力

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const victimIds = JSON.parse(fs.readFileSync("cache-victims-no-reservation.json", "utf8"));

console.log("=== キャッシュ問題で予約に進めなかった19人 ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, created_at")
    .in("patient_id", victimIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Supabaseクエリエラー:", error);
    process.exit(1);
  }

  // patient_idでユニークにする
  const uniqueByPid = {};
  data.forEach(row => {
    const pid = row.patient_id;
    if (!uniqueByPid[pid]) {
      uniqueByPid[pid] = row;
    }
  });

  // 提出日時順にソート
  const patients = Object.values(uniqueByPid);
  patients.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  console.log("Answerer ID\t氏名\t\t\tPatient ID");
  console.log("=".repeat(80));

  patients.forEach((p, idx) => {
    const answererId = p.answerer_id || "(なし)";
    const name = p.patient_name || "(名前なし)";
    const pid = p.patient_id;

    // タブ区切りで整形（氏名が短い場合は追加タブ）
    const namePadding = name.length < 8 ? "\t\t" : "\t";

    console.log(`${answererId}\t${name}${namePadding}${pid}`);
  });

  console.log("\n合計: " + patients.length + "人");

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
