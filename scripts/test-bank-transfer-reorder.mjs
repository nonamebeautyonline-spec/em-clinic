// scripts/test-bank-transfer-reorder.mjs
// 銀行振込（再購入）フローのテスト

const BASE_URL = "http://localhost:3000";

async function testReorderBankTransfer() {
  console.log("=== 銀行振込（再購入）フローテスト ===\n");

  const testData = {
    patientId: "TEST_REORDER_" + Date.now(),
    productCode: "MJL_5mg_2m",
    mode: "reorder", // ★ 再購入
    reorderId: "999", // ★ テスト用のreorder ID（実際のGASシートには存在しない）
    accountName: "サトウハナコ",
    phoneNumber: "08012345678",
    email: "reorder-test@example.com",
    postalCode: "456-7890",
    address: "大阪府大阪市北区梅田1-1-1 テストマンション202号室",
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
      console.log("  reorder_id:", orders[0].reorder_id);
      console.log("  account_name:", orders[0].account_name);
      console.log("  status:", orders[0].status);

      if (orders[0].mode === "reorder" && orders[0].reorder_id === testData.reorderId) {
        console.log("\n✅ 再購入パラメータが正しく保存されています");
      } else {
        console.log("\n❌ 再購入パラメータが正しく保存されていません");
      }
    } else {
      console.log("❌ Supabaseにデータが見つかりません");
    }

    console.log("\n=== テスト完了 ===");
    console.log("\n注意: GAS_REORDER_URL への呼び出しはreorder_id=999が存在しないためエラーになる可能性があります。");
    console.log("これは正常です。実際の再購入フローではGASシートに存在するreorder_idが使用されます。");

  } catch (e) {
    console.error("\n❌ エラー:", e);
  }
}

testReorderBankTransfer();
