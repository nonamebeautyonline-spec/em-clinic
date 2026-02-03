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
const KARTE_SECRET = process.env.KARTE_API_KEY;

async function fetchGASPatientData() {
  const patientIds = ["20260100327", "20260100725"];

  for (const patientId of patientIds) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`患者ID: ${patientId}`);
    console.log("=".repeat(60));

    try {
      const response = await fetch(GAS_KARTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "get",
          patient_id: patientId,
          secret: KARTE_SECRET,
        }),
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        const text = await response.text();
        console.error(text);
        continue;
      }

      const data = await response.json();

      if (data.ok) {
        console.log("\n✅ GASからデータ取得成功");
        console.log("\n--- GAS Intake Data ---");
        console.log(JSON.stringify(data.intake, null, 2));

        // 重要フィールドを抽出
        if (data.intake) {
          console.log("\n--- 重要フィールド ---");
          console.log(`患者名: ${data.intake.patient_name || "(なし)"}`);
          console.log(`LステップID: ${data.intake.answerer_id || "❌ 不足"}`);
          console.log(`LINE User ID: ${data.intake.line_user_id || "(なし)"}`);

          if (data.intake.answer_data) {
            const answerData = typeof data.intake.answer_data === "string"
              ? JSON.parse(data.intake.answer_data)
              : data.intake.answer_data;
            console.log(`性別: ${answerData.sex || "❌ 不足"}`);
            console.log(`生年月日: ${answerData.birth || "❌ 不足"}`);
            console.log(`電話番号: ${answerData.tel || "(なし)"}`);
          } else {
            console.log("❌ Answer data なし");
          }
        }
      } else {
        console.log(`❌ GAS error: ${data.error}`);
      }
    } catch (err) {
      console.error(`❌ Fetch error:`, err.message);
    }
  }
}

fetchGASPatientData().catch(console.error);
