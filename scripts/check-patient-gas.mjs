import { readFileSync } from "fs";
import { resolve } from "path";

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

const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;

console.log("=== GASシートでpatient_id: 20251200514 の予約確認 ===\n");

const response = await fetch(gasIntakeListUrl, { method: "GET" });
const gasData = await response.json();

const patient = gasData.find(r => {
  const pid = r.patient_id || r.患者ID;
  return String(pid) === "20251200514";
});

if (patient) {
  console.log("GASシート上の予約情報:");
  console.log("  patient_id:", patient.patient_id);
  console.log("  reserve_id:", patient.reserve_id || patient.予約ID);
  console.log("  reserved_date:", patient.reserved_date || patient.予約日);
  console.log("  reserved_time:", patient.reserved_time || patient.予約時間);
  console.log("  status:", patient.status || patient.ステータス);
} else {
  console.log("❌ GASシートに見つかりません");
}

console.log("\n=== 確認完了 ===");
