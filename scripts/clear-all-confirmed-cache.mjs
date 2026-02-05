import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

const redisUrl = envVars.KV_REST_API_URL;
const redisToken = envVars.KV_REST_API_TOKEN;

async function main() {
  if (!redisUrl || !redisToken) {
    console.error("Redis credentials not found");
    return;
  }

  // confirmed と pending の患者を全て取得
  const { data: reorders } = await supabase
    .from("reorders")
    .select("patient_id")
    .in("status", ["confirmed", "pending"]);

  const patients = [...new Set((reorders || []).map(r => r.patient_id))];

  console.log(`Clearing cache for ${patients.length} patients...\n`);

  let cleared = 0;
  for (const pid of patients) {
    const cacheKey = `dashboard:${pid}`;
    const url = `${redisUrl}/del/${cacheKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const result = await res.json();
      if (result.result > 0) {
        console.log(`✓ ${pid}`);
        cleared++;
      }
    } catch (err) {
      console.error(`✗ ${pid}: ${err.message}`);
    }
  }

  console.log(`\nDone! Cleared ${cleared} caches.`);
}

main();
