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

const GAS_ADMIN_URL = process.env.GAS_ADMIN_URL;
const ADMIN_SECRET = process.env.KARTE_API_KEY;

async function syncGASReservationsToDb() {
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS予約シートから今日の予約を取得: ${today}`);
  console.log("=".repeat(70));

  try {
    // GAS Admin APIを使って今日の予約データを取得
    const response = await fetch(GAS_ADMIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "get_reservations",
        date: today,
        secret: ADMIN_SECRET,
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);

      // 代替: 単にスプレッドシートの予約シートを読み取るように要求
      console.log("\n別の方法を試します...");

      const response2 = await fetch(GAS_ADMIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "read_sheet",
          sheet_name: "予約",
          secret: ADMIN_SECRET,
        }),
      });

      if (response2.ok) {
        const data2 = await response2.json();
        console.log("Response:", JSON.stringify(data2, null, 2));
      } else {
        console.error(`❌ HTTP Error 2: ${response2.status}`);
        const text2 = await response2.text();
        console.error("Response 2:", text2);
      }

      return;
    }

    const data = await response.json();

    if (!data.ok) {
      console.error(`❌ API Error:`, data.error || data.message);
      console.log("Response:", JSON.stringify(data, null, 2));
      return;
    }

    console.log("\n✅ GAS予約データ取得成功");
    console.log("Response:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

syncGASReservationsToDb().catch(console.error);
