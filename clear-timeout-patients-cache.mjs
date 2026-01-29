// clear-timeout-patients-cache.mjs
// タイムアウトした時刻（19:07:47前後）の患者のキャッシュをクリア

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.productionから環境変数を読み込む
const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminToken = envVars.ADMIN_TOKEN;
const vercelUrl = envVars.APP_BASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

if (!adminToken || !vercelUrl) {
  console.error("❌ Vercel環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== タイムアウト時刻前後の患者を検索 ===\n");

// 2026-01-28 の全患者（JST 19:00 = UTC 10:00）
// 念のため18:00〜20:00（UTC 09:00〜11:00）の範囲で検索
const { data, error } = await supabase
  .from("intake")
  .select("patient_id, patient_name, created_at")
  .gte("created_at", "2026-01-28T09:00:00")
  .lte("created_at", "2026-01-28T11:00:00")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log(`見つかった患者: ${data.length}名\n`);

for (const patient of data) {
  console.log(`患者ID: ${patient.patient_id}`);
  console.log(`  氏名: ${patient.patient_name || "(なし)"}`);
  console.log(`  作成日時: ${new Date(patient.created_at).toLocaleString("ja-JP")}`);

  // キャッシュクリア
  try {
    const response = await fetch(`${vercelUrl}/api/admin/invalidate-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ patient_id: patient.patient_id })
    });

    if (response.ok) {
      console.log(`  ✅ キャッシュクリア成功`);
    } else {
      console.log(`  ❌ キャッシュクリア失敗: ${response.status}`);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}`);
  }
  console.log("");
}

console.log("=== 完了 ===");
