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

async function main() {
  const redisUrl = envVars.KV_REST_API_URL;
  const redisToken = envVars.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error("Redis credentials not found");
    console.log("KV_REST_API_URL:", redisUrl ? "Found" : "Missing");
    console.log("KV_REST_API_TOKEN:", redisToken ? "Found" : "Missing");
    return;
  }

  // 今日 confirmed になった患者のキャッシュをクリア
  const patients = [
    "20260100499",
    "20260200180",
    "20251200280",
    "20260100190",
    "20251200994",
    "20260100647",
    "20251200128",
    "20260100866",
  ];

  console.log("Clearing cache for patients...\n");

  for (const pid of patients) {
    const cacheKey = `dashboard:${pid}`;

    // Upstash REST API
    const url = `${redisUrl}/del/${cacheKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
      });

      const result = await res.json();
      console.log(`${pid}: deleted=${result.result}`);
    } catch (err) {
      console.error(`${pid}: error - ${err.message}`);
    }
  }

  console.log("\nDone! Patients should see fresh data on next page load.");
}

main();
