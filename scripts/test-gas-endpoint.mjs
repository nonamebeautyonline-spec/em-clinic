// GAS endpoint test
const GAS_URL = "https://script.google.com/macros/s/AKfycbwR7A90YFNqpt8VNPKpMQMyA1CzVPDPaKGL3DywMuOPfKJEdlkEOHGqhKH_XzGpsndMlQ/exec";

console.log("=== GAS Endpoint テスト ===\n");

const testData = {
  type: "bank_transfer_order",
  order_id: "999",
  patient_id: "TEST_GAS_ENDPOINT_" + Date.now(),
  product_code: "MJL_2.5mg_1m",
  mode: "first",
  reorder_id: null,
  account_name: "エンドポイントテスト",
  phone_number: "09011112222",
  email: "endpoint-test@example.com",
  postal_code: "100-0001",
  address: "東京都千代田区千代田1-1",
  submitted_at: new Date().toISOString(),
};

console.log("送信データ:");
console.log(JSON.stringify(testData, null, 2));
console.log();

try {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData),
  });

  console.log(`レスポンス: ${res.status} ${res.statusText}`);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.substring(0, 200) };
  }

  console.log("\nレスポンス:");
  console.log(JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log("\n✅ GAS endpoint正常動作");
    console.log("\nスプレッドシート確認:");
    console.log(`  - patient_id: ${testData.patient_id}`);
    console.log("  - が記録されているか確認してください");
  } else {
    console.log("\n❌ GAS endpoint エラー");
  }
} catch (e) {
  console.error("\n❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
