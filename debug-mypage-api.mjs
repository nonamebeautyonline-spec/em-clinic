// debug-mypage-api.mjs
// マイページAPIのレスポンスを詳細に確認

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const patientId = "20251200404";

console.log(`=== マイページAPI詳細デバッグ (Patient ${patientId}) ===\n`);

try {
  console.log(`URL: ${VERCEL_URL}/api/mypage?patient_id=${patientId}\n`);

  const response = await fetch(`${VERCEL_URL}/api/mypage?patient_id=${patientId}`);

  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
  console.log("");

  const text = await response.text();
  console.log(`Response body length: ${text.length} characters`);
  console.log(`Response body (first 500 chars):`);
  console.log(text.substring(0, 500));
  console.log("");

  if (text) {
    try {
      const data = JSON.parse(text);
      console.log("✓ JSON parse成功");
      console.log("Data:", JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (err) {
      console.log("❌ JSON parse失敗:", err.message);
      console.log("\nFull response body:");
      console.log(text);
    }
  } else {
    console.log("⚠️  レスポンスボディが空です");
  }
} catch (err) {
  console.error("❌ Fetch error:", err.message);
}
