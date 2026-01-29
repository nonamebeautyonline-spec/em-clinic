// check-patient-20260101546.mjs
// 患者 20260101546 のデータを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 患者 20260101546 のデータ確認 ===\n");

const patientId = "20260101546";

try {
  // intakeテーブルを確認
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId);

  if (intakeError) {
    console.error("❌ intake クエリエラー:", intakeError);
  } else {
    console.log(`intake テーブル: ${intakeData.length}件\n`);

    if (intakeData.length > 0) {
      const record = intakeData[0];
      console.log("Patient ID:", record.patient_id);
      console.log("Patient Name:", record.patient_name);
      console.log("Answerer ID:", record.answerer_id);
      console.log("Reserve ID:", record.reserve_id);
      console.log("Reserved Date:", record.reserved_date);
      console.log("Reserved Time:", record.reserved_time);
      console.log("Status:", record.status);
      console.log("Created at:", new Date(record.created_at).toLocaleString("ja-JP"));
      console.log("\nAnswers object:");
      console.log(JSON.stringify(record.answers, null, 2));
    } else {
      console.log("⚠️  intakeテーブルにデータがありません");
    }
  }

  // reservationsテーブルを確認
  console.log("\n\n=== reservations テーブル ===\n");

  const { data: reserveData, error: reserveError } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId);

  if (reserveError) {
    console.error("❌ reservations クエリエラー:", reserveError);
  } else {
    console.log(`reservations テーブル: ${reserveData.length}件\n`);

    if (reserveData.length > 0) {
      reserveData.forEach((record, i) => {
        console.log(`\n予約 ${i + 1}:`);
        console.log("Reserve ID:", record.reserve_id);
        console.log("Patient Name:", record.patient_name);
        console.log("Reserved Date:", record.reserved_date);
        console.log("Reserved Time:", record.reserved_time);
        console.log("Status:", record.status);
        console.log("Created at:", new Date(record.created_at).toLocaleString("ja-JP"));
      });
    } else {
      console.log("⚠️  reservationsテーブルにデータがありません");
    }
  }

  // 結論
  console.log("\n\n=== 結論 ===\n");

  const hasIntake = intakeData && intakeData.length > 0;
  const hasReservation = reserveData && reserveData.length > 0;

  if (!hasIntake && !hasReservation) {
    console.log("❌ 問診データも予約データもSupabaseに存在しません");
    console.log("   → Google Sheetsには記録されているが、Supabase同期に失敗している");
  } else if (!hasIntake && hasReservation) {
    console.log("⚠️  予約データはあるが、問診データがありません");
    console.log("   → 問診を送信していない、またはintakeテーブルへの同期に失敗");
  } else if (hasIntake && !hasReservation) {
    console.log("⚠️  問診データはあるが、予約データがありません");
    console.log("   → reservationsテーブルへの同期に失敗");
  } else {
    console.log("✅ 問診データと予約データの両方が存在します");
    console.log("   → キャッシュの問題でマイページ/カルテに表示されていない可能性");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
