// invalidate-cache-20251200128.mjs
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error("❌ Missing Redis credentials");
  process.exit(1);
}

const redis = new Redis({ url, token });
const patientId = "20251200128";
const cacheKey = `dashboard:${patientId}`;

console.log(`=== Invalidating cache for ${patientId} ===`);

try {
  await redis.del(cacheKey);
  console.log(`✓ Cache deleted: ${cacheKey}`);
} catch (error) {
  console.error(`❌ Failed to delete cache:`, error);
}
