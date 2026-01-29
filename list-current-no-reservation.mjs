// list-current-no-reservation.mjs
// 19人のキャッシュ被害者のうち、現在も予約がない人だけを抽出

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== キャッシュ被害者のうち現在も予約なしの人 ===\n");

try {
  // 19人のpatient_idを読み込み
  const victimIds = JSON.parse(fs.readFileSync("cache-victims-no-reservation.json", "utf8"));

  console.log(`対象: ${victimIds.length}件\n`);

  // intakeテーブルから情報を取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, created_at")
    .in("patient_id", victimIds)
    .order("created_at", { ascending: false });

  if (intakeError) {
    console.error("❌ intakeクエリエラー:", intakeError);
    process.exit(1);
  }

  // patient_idでユニークにする
  const intakeByPid = {};
  intakeData.forEach(row => {
    const pid = row.patient_id;
    if (!intakeByPid[pid]) {
      intakeByPid[pid] = row;
    }
  });

  // reservationsテーブルから予約情報を取得
  const { data: reserveData, error: reserveError } = await supabase
    .from("reservations")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status")
    .in("patient_id", victimIds);

  if (reserveError) {
    console.error("❌ reservationsクエリエラー:", reserveError);
    process.exit(1);
  }

  // patient_idでグループ化
  const reserveByPid = {};
  reserveData.forEach(row => {
    const pid = row.patient_id;
    if (!reserveByPid[pid]) {
      reserveByPid[pid] = [];
    }
    if (row.reserve_id && row.reserve_id.trim() !== "") {
      reserveByPid[pid].push(row);
    }
  });

  // 予約がない人だけ抽出
  const stillNoReservation = [];

  victimIds.forEach(pid => {
    const intake = intakeByPid[pid];
    const reserves = reserveByPid[pid] || [];

    if (reserves.length === 0) {
      stillNoReservation.push({
        patient_id: pid,
        patient_name: intake?.patient_name || "(名前なし)",
        answerer_id: intake?.answerer_id || "",
        created_at: intake?.created_at || ""
      });
    }
  });

  // 提出日時順にソート
  stillNoReservation.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  console.log("Answerer ID\t氏名\t\t\tPatient ID");
  console.log("=".repeat(80));

  stillNoReservation.forEach(p => {
    const answererId = p.answerer_id || "(なし)";
    const name = p.patient_name || "(名前なし)";
    const pid = p.patient_id;

    // タブ区切りで整形（氏名が短い場合は追加タブ）
    const namePadding = name.length < 8 ? "\t\t" : "\t";

    console.log(`${answererId}\t${name}${namePadding}${pid}`);
  });

  console.log("\n合計: " + stillNoReservation.length + "人");

  console.log("\n=== 予約を入れた人（除外） ===");
  const withReservation = victimIds.filter(pid => {
    const reserves = reserveByPid[pid] || [];
    return reserves.length > 0;
  });

  if (withReservation.length > 0) {
    console.log(`${withReservation.length}人が予約済み:\n`);
    withReservation.forEach(pid => {
      const intake = intakeByPid[pid];
      const reserves = reserveByPid[pid];
      console.log(`  - ${pid}: ${intake?.patient_name || "(名前なし)"}`);
      reserves.forEach(r => {
        console.log(`      → ${r.reserve_id}: ${r.reserved_date} ${r.reserved_time}`);
      });
    });
  } else {
    console.log("(予約済みの人はいません)");
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  console.error(err.stack);
  process.exit(1);
}
