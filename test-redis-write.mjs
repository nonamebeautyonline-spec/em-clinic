// test-redis-write.mjs
// Redisへの書き込みが正常に動作するかテスト

import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error("❌ Missing Redis credentials");
  process.exit(1);
}

const redis = new Redis({ url, token });
const testKey = "test:write:" + Date.now();
const testData = {
  message: "Hello Redis",
  timestamp: new Date().toISOString(),
  number: 12345,
  nested: { foo: "bar" },
};

console.log("=== Testing Redis Write ===");
console.log("Key:", testKey);

try {
  // 1. 書き込みテスト（TTL 60秒）
  console.log("\n1. Writing to Redis...");
  await redis.set(testKey, testData, { ex: 60 });
  console.log("✓ Write successful");

  // 2. 読み込みテスト
  console.log("\n2. Reading from Redis...");
  const retrieved = await redis.get(testKey);
  console.log("✓ Read successful:");
  console.log("  Data:", retrieved);

  // 3. 一致確認
  console.log("\n3. Verifying data...");
  if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
    console.log("✓ Data matches!");
  } else {
    console.log("✗ Data mismatch");
    console.log("  Expected:", testData);
    console.log("  Got:", retrieved);
  }

  // 4. 削除
  console.log("\n4. Cleaning up...");
  await redis.del(testKey);
  console.log("✓ Test key deleted");

  console.log("\n=== Redis Write Test PASSED ===");
} catch (error) {
  console.error("\n❌ Test FAILED:", error.message);
  console.error(error);
}
