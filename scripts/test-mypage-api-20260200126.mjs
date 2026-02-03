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

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

async function testMypageApi() {
  const patientId = "20260200126";

  console.log(`\n${"=".repeat(70)}`);
  console.log(`GAS Mypage API (light=1) テスト: ${patientId}`);
  console.log("=".repeat(70));

  try {
    const url = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}&light=1`;
    console.log(`\nURL: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();
    console.log("\n✅ Response:");
    console.log(JSON.stringify(data, null, 2));

    console.log(`\n${"=".repeat(70)}`);
    console.log("重要なフィールド:");
    console.log(`  hasIntake: ${data.hasIntake}`);
    console.log(`  intakeId: ${data.intakeId || "(なし)"}`);
    console.log(`  patient.id: ${data.patient?.id || "(なし)"}`);
    console.log("=".repeat(70));

  } catch (err) {
    console.error(`❌ エラー:`, err.message);
  }
}

testMypageApi().catch(console.error);
