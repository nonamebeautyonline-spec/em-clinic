// test-redis-cache.mjs
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error("❌ Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  process.exit(1);
}

console.log("✓ Redis config found");
console.log("  URL:", url);
console.log("  Token:", token ? `${token.slice(0, 20)}...` : "missing");

const redis = new Redis({ url, token });

// テスト患者IDを指定
const testPatientId = process.argv[2] || "20251200128";
const cacheKey = `dashboard:${testPatientId}`;

console.log(`\n=== Testing Redis Cache ===`);
console.log(`Patient ID: ${testPatientId}`);
console.log(`Cache Key: ${cacheKey}`);

try {
  // 1. キャッシュを確認
  console.log("\n1. Checking if cache exists...");
  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log("✓ Cache HIT!");
    console.log("  Cached data keys:", Object.keys(cached));
    if (cached.reorders) {
      console.log("  Reorders count:", cached.reorders.length);
    }
  } else {
    console.log("✗ Cache MISS (no data found)");
  }

  // 2. TTLを確認
  console.log("\n2. Checking cache TTL...");
  const ttl = await redis.ttl(cacheKey);
  if (ttl > 0) {
    console.log(`✓ TTL: ${ttl} seconds (${Math.floor(ttl / 60)} minutes)`);
  } else if (ttl === -1) {
    console.log("✗ Key exists but has no expiration");
  } else {
    console.log("✗ Key does not exist");
  }

  // 3. 全キャッシュキーを確認
  console.log("\n3. Checking all dashboard cache keys...");
  const keys = await redis.keys("dashboard:*");
  console.log(`  Found ${keys.length} dashboard cache keys`);
  if (keys.length > 0) {
    console.log("  Keys:", keys.slice(0, 10).join(", "));
  }

} catch (error) {
  console.error("\n❌ Error:", error.message);
  console.error(error);
}
