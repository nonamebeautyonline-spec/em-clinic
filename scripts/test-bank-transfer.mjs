#!/usr/bin/env node

const testPayload = {
  patientId: "TEST20260131001",
  productCode: "MJL_2.5mg_1m",
  mode: "first",
  reorderId: null,
  accountName: "ヤマダタロウ",
  phoneNumber: "09012345678",
  email: "test@example.com",
  postalCode: "123-4567",
  address: "東京都渋谷区1-2-3 テストマンション101号室"
};

const url = "http://localhost:3000/api/bank-transfer/shipping";

console.log("=== 銀行振込テスト送信 ===");
console.log("URL:", url);
console.log("Payload:", JSON.stringify(testPayload, null, 2));
console.log("\n送信中...\n");

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(testPayload)
  });

  const status = response.status;
  const responseText = await response.text();

  console.log("=== レスポンス ===");
  console.log("Status:", status);
  console.log("Body:", responseText);

  if (status === 200) {
    console.log("\n✅ 成功！");
    console.log("\n次の確認を行ってください:");
    console.log("1. Supabase bank_transfer_orders テーブルを確認");
    console.log("2. GAS「2026-01 住所情報」シートを確認");
    console.log("3. Vercel Functions ログを確認");
    console.log("4. GAS Apps Script 実行ログを確認");
  } else {
    console.log("\n❌ エラー");
  }
} catch (error) {
  console.error("\n❌ 送信エラー:", error.message);
}
