import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const patientIds = ["20260100306", "20260200168"];

console.log("=== 管理画面マイページAPIテスト（予約確認） ===\n");

for (const patientId of patientIds) {
  console.log(`=== 患者ID: ${patientId} ===`);
  try {
    const response = await fetch(`http://localhost:3000/api/admin/view-mypage?patient_id=${patientId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${envVars.ADMIN_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`エラー: ${response.status} ${response.statusText}`);
      continue;
    }

    const result = await response.json();
    const data = result.data || result;

    console.log("【次回予約】");
    if (data.nextReservation) {
      console.log(`  id: ${data.nextReservation.id}`);
      console.log(`  datetime: ${data.nextReservation.datetime}`);
      console.log(`  title: ${data.nextReservation.title}`);
      console.log(`  status: ${data.nextReservation.status}`);
    } else {
      console.log("  なし");
    }
    console.log("");

  } catch (err) {
    console.error("エラー:", err.message);
  }
}
