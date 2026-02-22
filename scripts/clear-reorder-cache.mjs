/**
 * 修正済み reorder の該当顧客キャッシュを一括クリア
 * Usage: node scripts/clear-reorder-cache.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { Redis } from "@upstash/redis";

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

const redis = new Redis({
  url: envVars.KV_REST_API_URL,
  token: envVars.KV_REST_API_TOKEN,
});

// fix-confirmed-reorders.mjs で更新した70件の patient_id
const patientIds = [
  "20251200693","20260101092","20251200582","20251201063","20260100689",
  "20260100500","20260101191","20251200647","20251200783","20260100729",
  "20251200140","20251200809","20251200243","20260100810","20251200363",
  "20260100299","20260100121","20260100639","20260100547","20251200546",
  "20260100355","20260100273","20260100414","20251200627","20251200901",
  "20251200845","20260200294","20251201004","20260100853","20260100699",
  "20251200170","20260100469","20260100219","20260100308","20260100358",
  "20260100120","20251200686","20260100022","20260100192","20251200197",
  "20251201012","20251200954","20251200820","20260100828","20260100267",
  "20260100384","20251200510","20260100574","20260101012","20251200940",
  "20260100866","20260100005","20260100519","20260100971","20251200829",
  "20260100217","20251200461","20251200801","20251200896","20251201071",
  "20260100188","20251200475","20251200772","20251200396","20251200413",
  "20251200023","20251200301","20251200261","20251200670","20251200610",
];

async function main() {
  let cleared = 0;
  for (const pid of patientIds) {
    const key = `dashboard:${pid}`;
    const result = await redis.del(key);
    if (result > 0) {
      cleared++;
    }
  }
  console.log(`キャッシュクリア完了: ${cleared}/${patientIds.length}件`);
}

main().catch(console.error);
