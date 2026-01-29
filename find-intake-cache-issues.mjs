// find-intake-cache-issues.mjs
// Supabaseから問診送信済み・未判定の患者を取得

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診送信済み・未判定の患者を検索（Supabase） ===\n");

try {
  // intakeテーブルから、reserve_idが空（問診→予約フロー）かつstatusが空（未判定）のレコードを取得
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, status, created_at, answers")
    .or("reserve_id.is.null,reserve_id.eq.")
    .or("status.is.null,status.eq.")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("❌ Supabaseクエリエラー:", error);
    process.exit(1);
  }

  console.log(`取得した問診レコード: ${data.length}件\n`);

  if (data.length === 0) {
    console.log("✅ 問題なし！");
    process.exit(0);
  }

  // 問診送信済み = answersがある（空のオブジェクトではない）
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

  // patient_idでユニークにする
  const uniquePatients = {};
  problematic.forEach(row => {
    const pid = String(row.patient_id || "").trim();
    if (pid && !uniquePatients[pid]) {
      uniquePatients[pid] = {
        patient_id: pid,
        patient_name: row.patient_name || "",
        created_at: row.created_at || "",
      };
    }
  });

  const patientIds = Object.keys(uniquePatients);
  console.log(`ユニーク患者数: ${patientIds.length}件\n`);

  // 最新10件を表示
  patientIds.slice(0, 10).forEach((pid, idx) => {
    const p = uniquePatients[pid];
    console.log(`${idx + 1}. ${p.patient_name || "(名前なし)"} (${pid})`);
    console.log(`   問診送信日時: ${p.created_at}`);
    console.log("");
  });

  if (patientIds.length > 10) {
    console.log(`... 他 ${patientIds.length - 10}件\n`);
  }

  // problematic-intake-patient-ids.json に保存
  const fs = await import("fs");
  fs.writeFileSync(
    "problematic-intake-patient-ids.json",
    JSON.stringify(patientIds, null, 2)
  );

  console.log("✓ problematic-intake-patient-ids.json に保存しました");
  console.log(`✓ ${patientIds.length}件の患者IDを保存\n`);
  console.log("次のコマンドでキャッシュをクリアしてください:");
  console.log("node --env-file=.env.local clear-intake-caches.mjs");

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
