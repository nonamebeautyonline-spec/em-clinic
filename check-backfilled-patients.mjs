// check-backfilled-patients.mjs
// 今日バックフィルされた患者のpatient_idを分析

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== バックフィルされた患者のpatient_id分析 ===\n");

try {
  // 今日15:30-16:00の間に作成されたレコード（バックフィルデータ）
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, created_at")
    .gte("created_at", "2026-01-28T06:30:00Z")
    .lte("created_at", "2026-01-28T07:00:00Z")
    .order("patient_id", { ascending: true });

  if (error) {
    console.error("❌ クエリエラー:", error);
    process.exit(1);
  }

  console.log(`バックフィルされた件数: ${data.length}件\n`);

  if (data.length === 0) {
    console.log("バックフィルデータが見つかりません");
    process.exit(0);
  }

  // patient_idの範囲を確認
  const patientIds = data.map(row => row.patient_id).sort();
  const first = patientIds[0];
  const last = patientIds[patientIds.length - 1];

  console.log(`Patient ID範囲: ${first} ～ ${last}\n`);

  // patient_idを日付別に分類（IDに日付が含まれていると仮定）
  // 形式: YYYYMMXXXXX と仮定
  const dateGroups = {};

  patientIds.forEach(pid => {
    // 最初の8文字を日付として抽出 (YYYYMMDD)
    const dateStr = pid.substring(0, 8);

    // YYYYMMDD形式をYYYY/MM/DDに変換
    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const formatted = `${year}/${month}/${day}`;

      if (!dateGroups[formatted]) {
        dateGroups[formatted] = [];
      }
      dateGroups[formatted].push(pid);
    } else {
      // 日付形式でない場合
      if (!dateGroups["その他"]) {
        dateGroups["その他"] = [];
      }
      dateGroups["その他"].push(pid);
    }
  });

  console.log("=== Patient IDの日付別分布 ===\n");

  const sortedDates = Object.keys(dateGroups).filter(d => d !== "その他").sort();

  sortedDates.forEach(dateStr => {
    const count = dateGroups[dateStr].length;
    const firstPid = dateGroups[dateStr][0];
    const lastPid = dateGroups[dateStr][dateGroups[dateStr].length - 1];
    console.log(`${dateStr}: ${count}件 (${firstPid} ～ ${lastPid})`);
  });

  if (dateGroups["その他"]) {
    console.log(`その他: ${dateGroups["その他"].length}件`);
  }

  // 最新10件のpatient_idを表示
  console.log("\n=== 最新10件のpatient_id ===\n");
  const latestTen = patientIds.slice(-10);
  latestTen.reverse().forEach((pid, i) => {
    console.log(`${i + 1}. ${pid}`);
  });

  // 問診が完了できなかった可能性のある期間を推測
  console.log("\n=== 問診完了問題の推測 ===\n");

  if (sortedDates.length > 0) {
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    console.log(`バックフィル対象のPatient IDの日付範囲: ${firstDate} ～ ${lastDate}`);
    console.log("\nこれらの患者は:");
    console.log("1. 問診シートには記録されていた");
    console.log("2. Supabaseには同期されていなかった（2026/01/28 15:42まで）");
    console.log("\n推測される問題期間:");
    console.log(`  ${firstDate} ～ ${lastDate} の間に問診を送信した患者のうち、`);
    console.log(`  一部または全部がSupabase同期に失敗していた可能性があります。`);

    // 最も古い日付と新しい日付の差分
    const firstDateObj = new Date(firstDate);
    const lastDateObj = new Date(lastDate);
    const diffDays = Math.round((lastDateObj - firstDateObj) / (1000 * 60 * 60 * 24));

    console.log(`\n期間: 約${diffDays}日間`);
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
