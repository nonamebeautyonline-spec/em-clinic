// analyze-intake-timeline.mjs
// 問診送信の日付別パターンを分析

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== 問診送信の日付別分析 ===\n");

try {
  // 全件取得（ページネーション）
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  let allData = [];

  console.log("Supabaseからデータ取得中...");

  while (hasMore) {
    const { data: pageData, error } = await supabase
      .from("intake")
      .select("patient_id, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("❌ クエリエラー:", error);
      process.exit(1);
    }

    allData = allData.concat(pageData);
    console.log(`  ${allData.length}件取得済み`);

    if (pageData.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  console.log(`\n全件数: ${allData.length}件\n`);

  // 日付別に集計
  const dateGroups = {};

  allData.forEach(row => {
    const date = new Date(row.created_at);
    const dateStr = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = {
        count: 0,
        firstTime: date,
        lastTime: date,
        patients: []
      };
    }

    dateGroups[dateStr].count++;
    if (date < dateGroups[dateStr].firstTime) dateGroups[dateStr].firstTime = date;
    if (date > dateGroups[dateStr].lastTime) dateGroups[dateStr].lastTime = date;
    dateGroups[dateStr].patients.push(row.patient_id);
  });

  // 日付順にソート（新しい順）
  const sortedDates = Object.keys(dateGroups).sort((a, b) => {
    const dateA = new Date(a.split("/").reverse().join("-"));
    const dateB = new Date(b.split("/").reverse().join("-"));
    return dateB - dateA;
  });

  console.log("=== 日付別の問診送信数 ===\n");
  console.log("日付\t\t件数\t最初\t\t\t最後");
  console.log("=".repeat(100));

  sortedDates.forEach(dateStr => {
    const group = dateGroups[dateStr];
    const firstTime = group.firstTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    const lastTime = group.lastTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    console.log(`${dateStr}\t${group.count}件\t${firstTime}\t\t${lastTime}`);
  });

  // 今日のデータを詳細表示
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  if (dateGroups[today]) {
    console.log(`\n=== 今日 (${today}) の詳細 ===\n`);

    // 時間帯別に集計
    const hourGroups = {};

    allData
      .filter(row => {
        const date = new Date(row.created_at);
        const dateStr = date.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        });
        return dateStr === today;
      })
      .forEach(row => {
        const date = new Date(row.created_at);
        const hour = date.getHours();
        const minute = date.getMinutes();
        const timeKey = `${String(hour).padStart(2, '0')}:${String(Math.floor(minute / 10) * 10).padStart(2, '0')}`;

        if (!hourGroups[timeKey]) {
          hourGroups[timeKey] = [];
        }
        hourGroups[timeKey].push(row.patient_id);
      });

    const sortedTimes = Object.keys(hourGroups).sort().reverse();
    console.log("時間帯\t件数");
    console.log("-".repeat(30));
    sortedTimes.forEach(timeKey => {
      console.log(`${timeKey}\t${hourGroups[timeKey].length}件`);
    });

    // 15:42-15:43のバックフィル時間帯を特定
    const backfillCount = (hourGroups["15:40"] || []).length + (hourGroups["15:30"] || []).length;
    const realCount = dateGroups[today].count - backfillCount;

    console.log(`\n推定バックフィル: 15:42-15:43台の${(hourGroups["15:40"] || []).length}件`);
    console.log(`実際の問診送信: 約${realCount}件`);
  }

  // 問診が完了できなかった可能性のある期間を推測
  console.log("\n=== 問診完了問題の可能性がある期間 ===\n");

  // 送信数が極端に少ない日を探す
  const avgCount = allData.length / sortedDates.length;
  const lowActivityDates = sortedDates.filter(dateStr => {
    return dateGroups[dateStr].count < avgCount * 0.3; // 平均の30%以下
  });

  if (lowActivityDates.length > 0) {
    console.log("送信数が少ない日（平均の30%以下）:");
    lowActivityDates.forEach(dateStr => {
      console.log(`  ${dateStr}: ${dateGroups[dateStr].count}件（平均: ${Math.round(avgCount)}件）`);
    });
  } else {
    console.log("送信数に極端な落ち込みは見られません");
  }

  // 1日以上送信がない期間を探す
  console.log("\n送信がない期間:");
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const date1 = new Date(sortedDates[i].split("/").reverse().join("-"));
    const date2 = new Date(sortedDates[i + 1].split("/").reverse().join("-"));
    const diffDays = Math.round((date1 - date2) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      console.log(`  ${sortedDates[i + 1]} → ${sortedDates[i]}: ${diffDays}日間のギャップ`);
    }
  }

} catch (err) {
  console.error("❌ エラー:", err.message);
  process.exit(1);
}
