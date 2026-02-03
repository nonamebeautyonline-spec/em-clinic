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

async function addReservationToGas() {
  const patientId = "20260200126";
  const date = "2026-02-03";
  const time = "12:15";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS予約シートに予約を追加: ${patientId}`);
  console.log(`日時: ${date} ${time}`);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] GAS createReservation APIを呼び出し中...");

    const response = await fetch(GAS_RESERVATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "createReservation",
        patient_id: patientId,
        date: date,
        time: time,
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
      console.error(`❌ API Error:`, data.error || "Unknown");
      console.log("Response:", JSON.stringify(data, null, 2));

      // エラーの詳細を表示
      if (data.error === "already_reserved") {
        console.log("\n⚠️  この患者は既に予約があります");
      } else if (data.error === "slot_full") {
        console.log("\n⚠️  この時間枠は満員です");
      } else if (data.error === "outside_hours") {
        console.log("\n⚠️  営業時間外です");
      }
      return;
    }

    console.log(`\n✅ 予約追加成功`);
    console.log(`  予約ID: ${data.reserve_id || "(なし)"}`);
    console.log(`  患者ID: ${patientId}`);
    console.log(`  日時: ${date} ${time}`);

    console.log(`\n${"=".repeat(70)}`);
    console.log("✅ GAS予約シートへの追加が完了しました");
    console.log("問診シートにも予約情報が同期されているはずです");
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

addReservationToGas().catch(console.error);
