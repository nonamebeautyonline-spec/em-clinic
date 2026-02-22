// GAS reorder APIのレスポンスフィールドを確認するスクリプト
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

const GAS_REORDER_URL = envVars.GAS_REORDER_URL;
if (!GAS_REORDER_URL) { console.error("GAS_REORDER_URL not set"); process.exit(1); }

const res = await fetch(GAS_REORDER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "listAll", include_all: true }),
});

const json = await res.json();
const reorders = json.reorders || [];

console.log("全件数:", reorders.length);

// paidのサンプルを表示
const paidSamples = reorders.filter(r => r.status === "paid").slice(0, 5);
console.log("\n=== paidレコードのサンプル（全フィールド）===");
for (const r of paidSamples) {
  console.log(JSON.stringify(r, null, 2));
  console.log("---");
}

// 全フィールドキー一覧
if (reorders.length > 0) {
  const allKeys = new Set();
  for (const r of reorders) {
    for (const k of Object.keys(r)) allKeys.add(k);
  }
  console.log("\n全フィールドキー:", [...allKeys].sort().join(", "));
}

// ステータス別件数
const statusCount = {};
for (const r of reorders) {
  const s = r.status || "(empty)";
  statusCount[s] = (statusCount[s] || 0) + 1;
}
console.log("\nステータス別件数:", statusCount);
