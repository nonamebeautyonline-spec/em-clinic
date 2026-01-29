// clear-5patients-reorders-cache.js
// 5人の患者のreordersキャッシュをクリア

function clear5PatientsReordersCache() {
  const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

  const cache = CacheService.getScriptCache();

  Logger.log("=== 5人の患者のreordersキャッシュをクリア ===\n");

  for (let i = 0; i < patientIds.length; i++) {
    const pid = patientIds[i];
    const cacheKey = "reorders_" + pid;

    cache.remove(cacheKey);
    Logger.log("✓ Cleared: " + cacheKey);
  }

  Logger.log("\n=== 完了 ===");
  Logger.log("Vercelキャッシュもクリアしてください");
}
