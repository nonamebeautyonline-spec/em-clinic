// Google Sheets 問診データをSupabaseに一括同期するスクリプト
// 使い方: npx tsx scripts/sync-intake-to-supabase.ts

import { readFileSync } from "fs";
import { resolve } from "path";

// .env.localを手動でパース
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL;
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GAS_INTAKE_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

async function main() {
  console.log("=== Starting intake data sync ===");

  // 1. GASから直接全問診データを取得（GETリクエスト）
  console.log("Fetching data from GAS (GET request)...");

  const gasResponse = await fetch(GAS_INTAKE_URL, {
    method: "GET",
    redirect: "follow",
  });

  if (!gasResponse.ok) {
    throw new Error(`GAS fetch failed: ${gasResponse.status}`);
  }

  const gasData = await gasResponse.json();

  // GASはokとrowsを返すか、直接配列を返すかのどちらか
  let rows: any[];
  if (gasData.ok && Array.isArray(gasData.rows)) {
    rows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    rows = gasData;
  } else {
    console.error("Invalid GAS response:", JSON.stringify(gasData).substring(0, 500));
    throw new Error("Invalid GAS response");
  }

  console.log(`Fetched ${rows.length} rows from GAS`);

  // 2. Supabaseの既存データを全削除
  console.log("Deleting existing Supabase data...");
  const deleteResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/intake?patient_id=neq.___DUMMY___`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!deleteResponse.ok) {
    throw new Error(`Delete failed: ${deleteResponse.status}`);
  }

  console.log("Existing data deleted");

  // 3. 新しいデータを一括挿入
  console.log("Inserting new data into Supabase...");

  const records = rows
    .filter((row: any) => row.patient_id) // patient_idがあるもののみ
    .map((row: any) => ({
      patient_id: String(row.patient_id || "").trim(),
      reserve_id: String(row.reserveId || row.reserved || row.reserve_id || "").trim() || null,
      reserved_date: String(row.reserved_date || "").trim() || null,
      reserved_time: String(row.reserved_time || "").trim() || null,
      patient_name: String(row.patient_name || row.name || row["氏名"] || "").trim() || null,
      status: String(row.status || "").trim() || null,
      note: String(row.note || "").trim() || null,
      prescription_menu: String(row.prescription_menu || "").trim() || null,
      line_id: String(row.line_id || "").trim() || null,
      answerer_id: String(row.answerer_id || "").trim() || null,
      answers: extractAnswers(row),
    }));

  console.log(`Prepared ${records.length} records for insertion`);

  // バッチ挿入（500件ずつ）
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/intake`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(
        `Insert failed at batch ${i}: ${insertResponse.status} ${errorText}`
      );
    }

    inserted += batch.length;
    console.log(`Progress: ${inserted}/${records.length} records inserted`);
  }

  console.log("=== Sync completed successfully ===");
  console.log(`Total: ${inserted} records`);
}

// 問診回答を抽出
function extractAnswers(row: any): Record<string, any> {
  const answers: Record<string, any> = {};

  // GASの問診フィールドを全て取得
  for (const key of Object.keys(row)) {
    // reserve_id, patient_id など標準フィールド以外を answers に入れる
    if (
      ![
        "patient_id",
        "reserve_id",
        "reserved_date",
        "reserved_time",
        "patient_name",
        "status",
        "note",
        "prescription_menu",
        "line_id",
        "answerer_id",
        "予約時間", // GASが追加する互換フィールド
        "reserveId", // GASが追加する互換フィールド
      ].includes(key) &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {
      answers[key] = row[key];
    }
  }

  return answers;
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
