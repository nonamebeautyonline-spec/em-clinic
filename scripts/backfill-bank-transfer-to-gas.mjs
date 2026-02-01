// DBの銀行振込データをGASシートにバックフィル
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

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

console.log("=== DBの銀行振込データをGASシートにバックフィル（全期間） ===\n");

// 全ての銀行振込注文データをDBから取得
const { data: dbData, error } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ DBエラー:", error.message);
  process.exit(1);
}

// テストデータを除外
const realData = dbData.filter(row => {
  const pid = String(row.patient_id || "");
  return !pid.startsWith("TEST");
});

console.log(`DBから取得: ${dbData.length}件`);
console.log(`実患者データ: ${realData.length}件\n`);

if (realData.length > 0) {
  console.log("対象患者:");
  realData.forEach((row, idx) => {
    console.log(`  ${idx + 1}. 患者ID: ${row.patient_id}, 氏名: ${row.account_name}, 注文ID: ${row.id}`);
  });
  console.log("");
}

if (realData.length === 0) {
  console.log("バックフィルするデータがありません。");
  process.exit(0);
}

console.log("GASシートに送信中...\n");

let successCount = 0;
let failCount = 0;
const failedPatients = [];

for (const [index, row] of realData.entries()) {
  const payload = {
    type: "bank_transfer_order",
    order_id: String(row.id || ""),
    patient_id: row.patient_id,
    product_code: row.product_code,
    mode: row.mode || "first",
    reorder_id: row.reorder_id || null,
    account_name: row.account_name,
    phone_number: row.phone_number,
    email: row.email,
    postal_code: row.postal_code,
    address: row.address,
    submitted_at: row.submitted_at,
  };

  try {
    console.log(`[${index + 1}/${realData.length}] 送信中: ${row.patient_id} - ${row.account_name}`);

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (response.ok) {
      try {
        const json = JSON.parse(responseText);
        if (json.ok) {
          console.log(`  ✅ 成功 - シート: ${json.sheet}, 行: ${json.row}`);
          successCount++;
        } else {
          console.log(`  ❌ GASエラー: ${json.error}`);
          failCount++;
          failedPatients.push({ patient_id: row.patient_id, name: row.account_name, error: json.error });
        }
      } catch (e) {
        console.log(`  ✅ 成功 (${response.status}) - JSONパース失敗: ${responseText.substring(0, 100)}`);
        successCount++;
      }
    } else {
      console.log(`  ❌ HTTPエラー (${response.status}): ${responseText}`);
      failCount++;
      failedPatients.push({ patient_id: row.patient_id, name: row.account_name, error: `HTTP ${response.status}` });
    }

    // 少し待機（GAS API制限対策）
    await new Promise(resolve => setTimeout(resolve, 500));

  } catch (e) {
    console.error(`  ❌ 例外エラー: ${e.message}`);
    failCount++;
    failedPatients.push({ patient_id: row.patient_id, name: row.account_name, error: e.message });
  }
}

console.log("\n=== バックフィル完了 ===");
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${failCount}件`);

if (failedPatients.length > 0) {
  console.log("\n失敗した患者:");
  failedPatients.forEach((p, idx) => {
    console.log(`  ${idx + 1}. 患者ID: ${p.patient_id}, 氏名: ${p.name}`);
    console.log(`     エラー: ${p.error}`);
  });
  console.log("\nGASのログを確認してください。");
}
