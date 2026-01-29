// gas/intake/test-cache-invalidation.js
// キャッシュ無効化機能のテスト用スクリプト

/**
 * 環境変数の確認とテスト実行
 * GASエディタで実行: test_invalidateCache_config
 */
function test_invalidateCache_config() {
  Logger.log("=== Testing Cache Invalidation Configuration ===\n");

  const props = PropertiesService.getScriptProperties();
  const vercelUrl = props.getProperty("VERCEL_URL");
  const adminToken = props.getProperty("ADMIN_TOKEN");

  Logger.log("1. Environment Variables Check:");
  Logger.log("   VERCEL_URL: " + (vercelUrl ? "✅ Set (" + vercelUrl + ")" : "❌ Not Set"));
  Logger.log("   ADMIN_TOKEN: " + (adminToken ? "✅ Set (length=" + adminToken.length + ")" : "❌ Not Set"));

  if (!vercelUrl || !adminToken) {
    Logger.log("\n⚠️ Missing environment variables!");
    Logger.log("Please set in GAS: File > Project properties > Script properties");
    Logger.log("- VERCEL_URL: https://your-domain.vercel.app");
    Logger.log("- ADMIN_TOKEN: (same as Vercel env var)");
    return;
  }

  Logger.log("\n2. Testing API endpoint:");
  Logger.log("   Target: " + vercelUrl + "/api/admin/invalidate-cache");

  // テスト用のpatient_id（実際のIDに置き換えてください）
  const testPatientId = "20251200663";

  Logger.log("\n3. Calling invalidateVercelCache_ with test patient_id: " + testPatientId);

  try {
    invalidateVercelCache_(testPatientId);
    Logger.log("\n✅ Function call completed - check logs above for HTTP response");
  } catch (e) {
    Logger.log("\n❌ Error: " + e);
  }

  Logger.log("\n=== Test Complete ===");
  Logger.log("Expected in logs:");
  Logger.log("  [invalidateCache] pid=" + testPatientId + " code=200");
  Logger.log("  [invalidateCache] Success for patient_id=" + testPatientId);
}

/**
 * 実際のdoctor_updateフローをシミュレート
 * GASエディタで実行: test_doctor_update_flow
 */
function test_doctor_update_flow() {
  Logger.log("=== Testing Doctor Update Flow ===\n");

  // テスト用のreserveId（実際のIDに置き換えてください）
  const testReserveId = "test-reserve-001";
  const testStatus = "OK";
  const testNote = "テスト診察完了";
  const testMenu = "テストメニュー";

  Logger.log("Test parameters:");
  Logger.log("  reserveId: " + testReserveId);
  Logger.log("  status: " + testStatus);
  Logger.log("  note: " + testNote);
  Logger.log("  menu: " + testMenu);

  // doPost をシミュレート
  const testEvent = {
    postData: {
      contents: JSON.stringify({
        type: "doctor_update",
        reserveId: testReserveId,
        status: testStatus,
        note: testNote,
        prescriptionMenu: testMenu
      })
    }
  };

  Logger.log("\n⚠️ This will actually update the sheet!");
  Logger.log("Make sure the reserveId exists or change it to a real one.\n");

  try {
    const response = doPost(testEvent);
    const result = JSON.parse(response.getContent());
    Logger.log("\nResponse:");
    Logger.log(JSON.stringify(result, null, 2));

    if (result.ok) {
      Logger.log("\n✅ Doctor update successful");
      Logger.log("Check GAS logs for cache invalidation result");
    } else {
      Logger.log("\n❌ Doctor update failed: " + result.error);
    }
  } catch (e) {
    Logger.log("\n❌ Error: " + e);
  }

  Logger.log("\n=== Test Complete ===");
}

/**
 * COL定数の確認
 */
function test_column_constants() {
  Logger.log("=== Column Constants Check ===\n");

  Logger.log("COL_PATIENT_ID_INTAKE (Z列): " + (typeof COL_PATIENT_ID_INTAKE !== 'undefined' ? COL_PATIENT_ID_INTAKE : "❌ Not defined"));
  Logger.log("COL_STATUS_INTAKE (T列): " + (typeof COL_STATUS_INTAKE !== 'undefined' ? COL_STATUS_INTAKE : "❌ Not defined"));
  Logger.log("COL_RESERVE_ID_INTAKE: " + (typeof COL_RESERVE_ID_INTAKE !== 'undefined' ? COL_RESERVE_ID_INTAKE : "❌ Not defined"));
  Logger.log("COL_NOTE_INTAKE: " + (typeof COL_NOTE_INTAKE !== 'undefined' ? COL_NOTE_INTAKE : "❌ Not defined"));
  Logger.log("COL_MENU_INTAKE: " + (typeof COL_MENU_INTAKE !== 'undefined' ? COL_MENU_INTAKE : "❌ Not defined"));

  Logger.log("\n=== Test Complete ===");
}
