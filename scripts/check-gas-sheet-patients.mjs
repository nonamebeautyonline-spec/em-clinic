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

const GAS_KARTE_URL = process.env.GAS_KARTE_URL;
const KARTE_API_KEY = process.env.KARTE_API_KEY;

async function checkGASSheetPatients() {
  const patientIds = ["20260100327", "20260100725"];

  console.log("GASカルテAPIを使用してデータを取得します...\n");

  for (const patientId of patientIds) {
    console.log(`${"=".repeat(60)}`);
    console.log(`患者ID: ${patientId}`);
    console.log("=".repeat(60));

    try {
      // getPatientBundleを使用してデータを取得
      const response = await fetch(GAS_KARTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "getPatientBundle",
          patientId: patientId,
          apiKey: KARTE_API_KEY,
        }),
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        const text = await response.text();
        console.error(text);
        continue;
      }

      const data = await response.json();

      if (!data.ok) {
        console.error(`❌ API Error:`, data.error || data.message);
        continue;
      }

      console.log("\n✅ GASからデータ取得成功");

      console.log("\n--- 患者基本情報 ---");
      if (data.patient) {
        console.log(`患者名: ${data.patient.name || "(なし)"}`);
        console.log(`電話番号: ${data.patient.phone || "(なし)"}`);
      } else {
        console.log("❌ 患者データなし");
      }

      console.log(`\n--- 問診データ (${data.intakes?.length || 0}件) ---`);
      if (data.intakes && data.intakes.length > 0) {
        // 最新の問診データを表示
        const latest = data.intakes[0];
        console.log("最新の問診:");
        console.log(`  提出日時: ${latest.submittedAt || "(なし)"}`);
        console.log(`  医師メモ: ${latest.doctorNote || "(なし)"}`);

        if (latest.record) {
          console.log("\n  問診レコード:");
          console.log(`    answerer_id: ${latest.record.answerer_id || "❌ 不足"}`);
          console.log(`    line_user_id: ${latest.record.line_user_id || "(なし)"}`);
          console.log(`    sex: ${latest.record.sex || "❌ 不足"}`);
          console.log(`    birth: ${latest.record.birth || "❌ 不足"}`);
          console.log(`    tel: ${latest.record.tel || "(なし)"}`);
          console.log(`    height: ${latest.record.height || "(なし)"}`);
          console.log(`    weight: ${latest.record.weight || "(なし)"}`);

          // 全フィールドを表示
          console.log("\n  --- 全フィールド ---");
          Object.keys(latest.record).forEach(key => {
            const value = latest.record[key];
            if (value !== null && value !== undefined && value !== "") {
              console.log(`    ${key}: ${String(value).substring(0, 100)}`);
            }
          });
        }
      } else {
        console.log("❌ 問診データなし");
      }

    } catch (err) {
      console.error(`❌ Fetch error:`, err.message);
    }

    console.log();
  }
}

checkGASSheetPatients().catch(console.error);
