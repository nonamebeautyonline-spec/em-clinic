#!/usr/bin/env node

// GASに直接テストリクエストを送信
const GAS_URL = "https://script.google.com/macros/s/AKfycbwR7A90YFNqpt8VNPKpMQMyA1CzVPDPaKGL3DywMuOPfKJEdlkEOHGqhKH_XzGpsndMlQ/exec";

const testPayload = {
  type: "bank_transfer_order",
  order_id: "999",
  patient_id: "TEST20260131002",
  product_code: "MJL_2.5mg_1m",
  mode: "first",
  reorder_id: null,
  account_name: "テストタロウ",
  phone_number: "09087654321",
  email: "test2@example.com",
  postal_code: "100-0001",
  address: "東京都千代田区千代田1-1",
  submitted_at: new Date().toISOString()
};

console.log("=== GAS直接テスト送信 ===");
console.log("URL:", GAS_URL);
console.log("Payload:", JSON.stringify(testPayload, null, 2));
console.log("\n送信中...\n");

try {
  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(testPayload),
    redirect: "follow"
  });

  const status = response.status;
  const responseText = await response.text();

  console.log("=== レスポンス ===");
  console.log("Status:", status);
  console.log("Body:", responseText);

  if (status === 200) {
    try {
      const json = JSON.parse(responseText);
      console.log("\n✅ 成功！");
      console.log("返却データ:", JSON.stringify(json, null, 2));
      console.log("\n次の確認:");
      console.log("1. https://script.google.com でGASログを確認");
      console.log("2. 銀行振込管理シートの「2026-01 住所情報」を確認");
    } catch (e) {
      console.log("\n⚠️  JSONパースエラー - レスポンスがHTML形式の可能性");
    }
  } else {
    console.log("\n❌ エラー");
  }
} catch (error) {
  console.error("\n❌ 送信エラー:", error.message);
}
