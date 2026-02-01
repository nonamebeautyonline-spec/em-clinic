// 同じ時間に複数の予約がないか確認
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 予約時間の重複チェック ===\n");

// 今日のpending予約を取得
const { data: pendingReservations, error } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

if (error) {
  console.error("エラー:", error.message);
  process.exit(1);
}

console.log(`【pending予約】${pendingReservations.length}件\n`);

// 時間ごとにグループ化
const timeGroups = {};

for (const res of pendingReservations) {
  const time = res.reserved_time;
  if (!timeGroups[time]) {
    timeGroups[time] = [];
  }
  timeGroups[time].push(res);
}

// 重複をチェック
const duplicates = [];
for (const [time, reservations] of Object.entries(timeGroups)) {
  if (reservations.length > 1) {
    duplicates.push({ time, reservations });
  }
}

if (duplicates.length > 0) {
  console.log(`【重複している時間】${duplicates.length}件\n`);
  for (const dup of duplicates) {
    console.log(`時間: ${dup.time} - ${dup.reservations.length}件の予約`);
    for (const res of dup.reservations) {
      console.log(`  - reserve_id: ${res.reserve_id}, patient_id: ${res.patient_id}`);
    }
    console.log();
  }
} else {
  console.log("時間の重複はありません。");
}

// 全ての時間を表示
console.log("\n【全予約時間】");
const sortedTimes = Object.keys(timeGroups).sort();
for (const time of sortedTimes) {
  const count = timeGroups[time].length;
  const marker = count > 1 ? " ⚠️ 重複!" : "";
  console.log(`${time}: ${count}件${marker}`);
}

console.log("\n=== 確認完了 ===");
