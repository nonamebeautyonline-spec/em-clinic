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
const targetDate = "2026-01-30";

const response = await fetch(gasIntakeListUrl + "?from=" + targetDate + "&to=" + targetDate);
const gasData = await response.json();

const withReservation = gasData.filter(r => {
  const date = r.reserved_date || r.予約日;
  return date && date !== "";
});

console.log("予約件数: " + withReservation.length);
console.log("\n最初の1件のフィールド:");
if (withReservation.length > 0) {
  console.log(JSON.stringify(withReservation[0], null, 2));
}
