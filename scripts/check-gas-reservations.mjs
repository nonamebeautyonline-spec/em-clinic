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

const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;
const today = new Date().toISOString().slice(0, 10);

console.log("=== GASシートの今日の予約数確認 ===\n");
console.log(`日付: ${today}\n`);

const response = await fetch(`${gasIntakeListUrl}?from=${today}&to=${today}`, {
  method: "GET",
});

const gasData = await response.json();

// 予約を持っているレコード（reserved_dateがnullでない）
const withReservation = gasData.filter(r => {
  const date = r.reserved_date || r.予約日;
  return date && date !== "";
});

console.log(`【GASシート】今日の予約: ${withReservation.length}件\n`);

// ステータス別の内訳
const statusCounts = {};
withReservation.forEach(r => {
  const status = r.status || r.ステータス || "null";
  statusCounts[status] = (statusCounts[status] || 0) + 1;
});

console.log("ステータス別内訳:");
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}件`);
});

console.log("\n=== 確認完了 ===");
