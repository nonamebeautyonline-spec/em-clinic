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

const GAS_INTAKE_URL = process.env.GAS_INTAKE_LIST_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function callGasUpdateReservation() {
  const patientId = "20260200126";
  const reserveId = "resv-1770084040110";
  const reservedDate = "2026-02-03";
  const reservedTime = "12:15";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS問診シートに予約情報を書き込み: ${patientId}`);
  console.log(`予約ID: ${reserveId}`);
  console.log(`日時: ${reservedDate} ${reservedTime}`);
  console.log("=".repeat(70));

  try {
    console.log("\n[1/1] GAS update_reservation_info_by_pid APIを呼び出し中...");

    const response = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "update_reservation_info_by_pid",
        patient_id: patientId,
        reserve_id: reserveId,
        reserved_date: reservedDate,
        reserved_time: reservedTime,
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
      console.error(`❌ API Error:`, data.error || "Unknown");
      console.log("Response:", JSON.stringify(data, null, 2));
      return;
    }

    console.log(`\n✅ 更新成功`);
    console.log(`  患者ID: ${data.patient_id}`);
    console.log(`  予約ID: ${data.reserve_id}`);
    console.log(`  日時: ${data.reserved_date} ${data.reserved_time}`);
    console.log(`  行番号: ${data.row}`);

    console.log(`\n${"=".repeat(70)}`);
    console.log("✅ GAS問診シートへの書き込みが完了しました");
    console.log("医師がカルテを記入してOK判定を出せるようになりました");
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
    console.error(err.stack);
  }
}

callGasUpdateReservation().catch(console.error);
