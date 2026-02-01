// scripts/test-bank-transfer-flow.mjs
// 銀行振込フローのテスト

const BASE_URL = "http://localhost:3000";

async function testBankTransferFlow() {
  console.log("=== 銀行振込フローテスト ===\n");

  const testData = {
    patientId: "TEST_BANK_" + Date.now(),
    productCode: "MJL_2.5mg_1m",
    mode: "first",
    reorderId: null,
    accountName: "ヤマダタロウ",
    phoneNumber: "09012345678",
    email: "test@example.com",
    postalCode: "123-4567",
    address: "東京都千代田区丸の内1-1-1 テストビル101号室",
  };

  console.log("テストデータ:");
  console.log(JSON.stringify(testData, null, 2));
  console.log();

  try {
    console.log("📤 APIリクエスト送信中...");
    const res = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    console.log(`📥 レスポンス: ${res.status} ${res.statusText}`);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    console.log("\nレスポンスボディ:");
    console.log(JSON.stringify(json, null, 2));

    if (!res.ok) {
      console.log("\n❌ テスト失敗");
      return;
    }

    console.log("\n✅ APIレスポンス成功");

    // Supabaseでデータ確認
    console.log("\n📊 Supabaseでデータ確認中...");

    const { createClient } = await import("@supabase/supabase-js");
    const { readFileSync } = await import("fs");
    const { resolve } = await import("path");

    const envPath = resolve(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        let value = valueParts.join("=").trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value;
      }
    });

    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: orders, error } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", testData.patientId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.log("❌ Supabase確認エラー:", error);
    } else if (orders && orders.length > 0) {
      console.log("✅ Supabaseに保存確認:");
      console.log("  ID:", orders[0].id);
      console.log("  patient_id:", orders[0].patient_id);
      console.log("  product_code:", orders[0].product_code);
      console.log("  mode:", orders[0].mode);
      console.log("  account_name:", orders[0].account_name);
      console.log("  phone_number:", orders[0].phone_number);
      console.log("  email:", orders[0].email);
      console.log("  postal_code:", orders[0].postal_code);
      console.log("  address:", orders[0].address);
      console.log("  status:", orders[0].status);
      console.log("  created_at:", orders[0].created_at);
    } else {
      console.log("❌ Supabaseにデータが見つかりません");
    }

    console.log("\n=== テスト完了 ===");

  } catch (e) {
    console.error("\n❌ エラー:", e);
  }
}

testBankTransferFlow();
