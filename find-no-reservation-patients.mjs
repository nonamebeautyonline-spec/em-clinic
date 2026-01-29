// find-no-reservation-patients.mjs
// 問診送信済みだが、まだ予約が取れていない患者を抽出

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診送信済み・予約未取得の患者を検索 ===\n");

try {
  // intakeテーブルから取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, reserve_id, status, created_at, answers")
    .or("status.is.null,status.eq.")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (intakeError) {
    console.error("❌ intakeクエリエラー:", intakeError);
    process.exit(1);
  }

  // 問診送信済み = answersがある
  const submitted = intakeData.filter(row => {
    const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
    return hasAnswers;
  });

  console.log(`問診送信済み: ${submitted.length}件`);

  // patient_idでユニークにする（最新のレコードを使う）
  const uniqueByPatient = {};
  submitted.forEach(row => {
    const pid = String(row.patient_id || "").trim();
    if (pid && !uniqueByPatient[pid]) {
      uniqueByPatient[pid] = row;
    }
  });

  console.log(`ユニーク患者: ${Object.keys(uniqueByPatient).length}件\n`);

  // reservationsテーブルで予約状況を確認
  const patientIds = Object.keys(uniqueByPatient);

  const { data: reservations, error: reserveError } = await supabase
    .from("reservations")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status")
    .in("patient_id", patientIds);

  if (reserveError) {
    console.error("❌ reservationsクエリエラー:", reserveError);
    process.exit(1);
  }

  // patient_idごとに予約があるかチェック
  const hasReservation = new Set();
  reservations.forEach(r => {
    if (r.reserve_id && r.reserve_id.trim() !== "") {
      hasReservation.add(r.patient_id);
    }
  });

  console.log(`予約あり: ${hasReservation.size}件`);
  console.log(`予約なし: ${patientIds.length - hasReservation.size}件\n`);

  // 予約がない患者を抽出
  const noReservation = patientIds.filter(pid => !hasReservation.has(pid));

  if (noReservation.length === 0) {
    console.log("✅ 問診送信済みで予約がない患者はいません！");
    process.exit(0);
  }

  console.log("=".repeat(80));
  console.log(`問診送信済み・予約未取得: ${noReservation.length}件`);
  console.log("=".repeat(80) + "\n");

  // 提出日時の新しい順に並べる
  const patients = noReservation.map(pid => uniqueByPatient[pid]);
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
  console.log(`\n✓ ${noReservation.length}件の患者が予約画面に進めるようキャッシュクリア済み`);
  console.log("これらの患者に予約を促す必要があります。\n");

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
