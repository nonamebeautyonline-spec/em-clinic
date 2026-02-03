import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function backfillTodayReservations() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS予約シートから今日の予約を同期: ${today}`);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] backfill_reservations APIを呼び出し中...");

    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "backfill_reservations",
        date: today,
        token: ADMIN_TOKEN,
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();

    if (!data.ok) {
      console.error(`❌ API Error:`, data.error || "Unknown error");
      console.log("Response:", JSON.stringify(data, null, 2));
      return;
    }

    console.log("\n✅ 同期完了");
    console.log(`\n結果:`);
    console.log(`  - 処理件数: ${data.processed}件`);
    console.log(`  - 同期成功: ${data.synced}件`);
    console.log(`  - エラー: ${data.errors}件`);
    console.log(`  - スキップ: ${data.skipped}件`);
    console.log(`  - 全体行数: ${data.total_rows}件`);

    if (data.details && data.details.length > 0) {
      console.log(`\n詳細（最初の20件）:`);
      data.details.slice(0, 20).forEach(detail => {
        console.log(`  ${detail}`);
      });
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("注意: このAPIはキャンセルされた予約をスキップします。");
    console.log("Supabaseで既存のpending予約をcanceledに更新するには、");
    console.log("別途スクリプトが必要です。");
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

backfillTodayReservations().catch(console.error);
