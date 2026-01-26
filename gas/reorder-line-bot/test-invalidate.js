// テスト用：直接キャッシュ無効化を試す
function testInvalidateCache() {
  // ★ 実際の患者IDに変更してください
  var testPatientId = "20251200006";

  Logger.log("=== Testing invalidateVercelCache ===");
  Logger.log("Patient ID: " + testPatientId);

  invalidateVercelCache_(testPatientId);

  Logger.log("=== Test complete - check logs above ===");
}
