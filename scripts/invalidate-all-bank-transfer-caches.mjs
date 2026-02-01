// 銀行振込顧客全員のキャッシュを削除
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const adminToken = envVars.ADMIN_TOKEN;
const vercelUrl = envVars.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";

if (!adminToken) {
  console.error("❌ ADMIN_TOKEN が設定されていません");
  process.exit(1);
}

console.log("=== 銀行振込顧客キャッシュ削除 ===\n");

// 実際の顧客データのみ取得（TESTを除外）
const { data: orders, error } = await supabase
  .from("bank_transfer_orders")
  .select("patient_id")
  .not("patient_id", "like", "TEST%")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ Supabaseからの取得エラー:", error);
  process.exit(1);
}

// patient_idの重複を削除
const uniquePatientIds = [...new Set(orders.map(o => o.patient_id))];

console.log(`📋 対象顧客数: ${uniquePatientIds.length} 人\n`);

let successCount = 0;
let failCount = 0;

for (const patientId of uniquePatientIds) {
  console.log(`処理中: ${patientId}...`);

  try {
    const invalidateUrl = `${vercelUrl}/api/admin/invalidate-cache`;
    const response = await fetch(invalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ patient_id: patientId }),
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log(`  ✅ キャッシュ削除成功`);
      successCount++;
    } else {
      console.error(`  ❌ 失敗 (${response.status}): ${responseText}`);
      failCount++;
    }
  } catch (e) {
    console.error(`  ❌ エラー:`, e.message);
    failCount++;
  }

  // レート制限を避けるため少し待機
  await new Promise(r => setTimeout(r, 300));
}

console.log("\n=== 完了 ===");
console.log(`✅ 成功: ${successCount} 件`);
if (failCount > 0) {
  console.log(`❌ 失敗: ${failCount} 件`);
}
console.log("\n📝 これで顧客がマイページを開くと最新情報が表示されます");
