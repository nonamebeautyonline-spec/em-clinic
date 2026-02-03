// scripts/migrate-reorders-from-gas.mjs
// GASシートから既存の再処方データをSupabase DBに移行するスクリプト

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_REORDER_URL = envVars.GAS_REORDER_URL;

if (!GAS_REORDER_URL) {
  console.error("GAS_REORDER_URL not set");
  process.exit(1);
}

console.log("=== GASから再処方データを移行 ===\n");

// GASから全データを取得
console.log("GASから全データを取得中...");
const gasRes = await fetch(GAS_REORDER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "listAll",
    include_all: true,
  }),
});

const gasText = await gasRes.text();
let gasJson;
try {
  gasJson = JSON.parse(gasText);
} catch (e) {
  console.error("GAS response parse error:", gasText);
  process.exit(1);
}

if (!gasRes.ok || gasJson.ok === false) {
  console.error("GAS error:", gasJson.error || gasRes.status);
  process.exit(1);
}

const reorders = gasJson.reorders || [];
console.log(`取得件数: ${reorders.length}件\n`);

if (reorders.length === 0) {
  console.log("移行するデータがありません");
  process.exit(0);
}

// 既存のDBデータを確認
const { data: existingData, error: existingError } = await supabase
  .from("reorders")
  .select("gas_row_number")
  .order("gas_row_number", { ascending: false });

if (existingError) {
  console.error("既存データ確認エラー:", existingError.message);
  process.exit(1);
}

const existingRowNumbers = new Set(
  (existingData || []).map((r) => r.gas_row_number)
);
console.log(`既存DBレコード数: ${existingRowNumbers.size}件`);

// 移行データを整形
const insertData = [];
for (const r of reorders) {
  // GAS行番号（idフィールドがGAS行番号）
  const gasRowNumber = parseInt(r.id, 10);

  if (!Number.isFinite(gasRowNumber)) {
    console.warn(`無効なID: ${r.id}, スキップ`);
    continue;
  }

  // 既にDBにある場合はスキップ
  if (existingRowNumbers.has(gasRowNumber)) {
    continue;
  }

  // timestampをISOフォーマットに変換
  let timestamp = r.timestamp;
  if (timestamp && !timestamp.includes("T")) {
    // "2024/01/15 10:30:00" → "2024-01-15T10:30:00"
    timestamp = timestamp.replace(/\//g, "-").replace(" ", "T");
  }

  // statusのマッピング（GAS → DB）
  let status = r.status || "pending";
  if (status === "confirmed") status = "approved";
  if (status === "canceled") status = "cancelled";

  insertData.push({
    timestamp: timestamp || new Date().toISOString(),
    patient_id: r.patient_id,
    product_code: r.product_code,
    status: status,
    note: r.note || null,
    line_uid: r.line_uid || null,
    lstep_uid: r.lstep_uid || null,
    gas_row_number: gasRowNumber,
    created_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

console.log(`新規挿入対象: ${insertData.length}件\n`);

if (insertData.length === 0) {
  console.log("挿入するデータがありません（全て既存）");
  process.exit(0);
}

// バッチ挿入（100件ずつ）
const batchSize = 100;
let inserted = 0;
let errors = 0;

for (let i = 0; i < insertData.length; i += batchSize) {
  const batch = insertData.slice(i, i + batchSize);
  const { data, error } = await supabase
    .from("reorders")
    .insert(batch)
    .select();

  if (error) {
    console.error(`バッチ ${Math.floor(i / batchSize) + 1} エラー:`, error.message);
    errors += batch.length;
  } else {
    inserted += data.length;
    console.log(`バッチ ${Math.floor(i / batchSize) + 1}: ${data.length}件挿入`);
  }
}

console.log("\n=== 移行完了 ===");
console.log(`成功: ${inserted}件`);
console.log(`エラー: ${errors}件`);

// 最終確認
const { count } = await supabase
  .from("reorders")
  .select("*", { count: "exact", head: true });

console.log(`\n現在のDBレコード数: ${count}件`);
