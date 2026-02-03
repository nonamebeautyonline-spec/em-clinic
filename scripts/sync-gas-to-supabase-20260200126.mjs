import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const GAS_INTAKE_URL = process.env.GAS_INTAKE_LIST_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function syncGasToSupabase() {
  const patientId = "20260200126";

  console.log("\n" + "=".repeat(70));
  console.log("GAS問診シートからSupabaseへ同期: " + patientId);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] GAS backfill_all_intake APIを呼び出し中...");

    const response = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "backfill_all_intake",
        token: ADMIN_TOKEN,
      }),
    });

    if (!response.ok) {
      console.error("❌ HTTP Error: " + response.status);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();

    console.log("\n✅ Response:");
    console.log(JSON.stringify(data, null, 2));

    console.log("\n" + "=".repeat(70));
    console.log("✅ 同期APIを呼び出しました");
    console.log("GASログを確認してください");
    console.log("=".repeat(70));

  } catch (err) {
    console.error("❌ エラー:", err.message);
  }
}

syncGasToSupabase().catch(console.error);
