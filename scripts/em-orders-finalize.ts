// scripts/em-orders-finalize.ts
// EMオンラインクリニック: em_order_staging → orders テーブルへ本投入
//
// 使い方:
//   npx tsx scripts/em-orders-finalize.ts --tenant-id <UUID>           # ドライラン
//   npx tsx scripts/em-orders-finalize.ts --tenant-id <UUID> --exec    # 本番実行
//
// 前提: em-order-phone-match.ts で照合済み（matched_patient_id がセットされている）

import { readFileSync } from "fs";
import { resolve } from "path";

// .env.local読み込み
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("環境変数不足: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const tenantId = getArg("tenant-id");
const isExec = args.includes("--exec");
const allowUnmatched = args.includes("--allow-unmatched");

if (!tenantId) {
  console.error("使い方: npx tsx scripts/em-orders-finalize.ts --tenant-id <UUID> [--exec] [--allow-unmatched]");
  process.exit(1);
}

async function supabaseGet<T>(table: string, params: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${table} 失敗: ${res.status} ${await res.text()}`);
  return res.json();
}

type StagingRow = {
  id: number;
  matched_patient_id: string | null;
  match_type: string | null;
  source_name: string | null;
  source_email: string | null;
  source_phone: string | null;
  source_postal: string | null;
  source_address: string | null;
  product_name: string | null;
  amount: number;
  paid_at: string | null;
  csv_year: number | null;
};

async function main() {
  console.log("=== EMオンラインクリニック orders本投入 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);

  // 1. ステージングデータの状況確認
  const allStaging = await supabaseGet<StagingRow>(
    "em_order_staging",
    `select=id,matched_patient_id,match_type,source_name,source_email,source_phone,source_postal,source_address,product_name,amount,paid_at,csv_year&tenant_id=eq.${tenantId}&limit=100000`,
  );

  const matched = allStaging.filter((s) => s.matched_patient_id);
  const unmatched = allStaging.filter((s) => !s.matched_patient_id);

  console.log(`\nステージング全件: ${allStaging.length}`);
  console.log(`紐付け済み:       ${matched.length}`);
  console.log(`未紐付け:         ${unmatched.length}`);

  // match_type 別内訳
  const typeCounts: Record<string, number> = {};
  for (const s of matched) {
    const t = s.match_type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  console.log("\n--- match_type 別内訳 ---");
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }

  // 金額合計
  const matchedAmount = matched.reduce((sum, s) => sum + s.amount, 0);
  const totalAmount = allStaging.reduce((sum, s) => sum + s.amount, 0);
  console.log(`\n金額合計（紐付け済み）: ${matchedAmount.toLocaleString()}円`);
  console.log(`金額合計（全体）:       ${totalAmount.toLocaleString()}円`);

  // 未紐付けチェック
  if (unmatched.length > 0 && !allowUnmatched) {
    console.log(`\n未紐付けレコードが ${unmatched.length} 件あります。`);
    console.log("先に em-order-phone-match.ts で照合を完了させてください。");
    console.log("未紐付けのまま投入する場合は --allow-unmatched フラグを追加してください。");
    if (!isExec) return;
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 2. orders テーブルに INSERT
  console.log("\nordersテーブルにINSERT中...");
  const target = allowUnmatched ? allStaging.filter((s) => s.matched_patient_id) : matched;
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < target.length; i += batchSize) {
    const batch = target.slice(i, i + batchSize);
    const records = batch.map((s) => ({
      id: `EM-${s.csv_year || "0000"}-${s.id}`,
      patient_id: s.matched_patient_id,
      product_name: s.product_name,
      amount: s.amount,
      paid_at: s.paid_at,
      payment_status: "paid",
      shipping_status: "pending",
      email: s.source_email,
      phone: s.source_phone,
      tenant_id: tenantId,
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(records),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`バッチ ${i} エラー: ${res.status} ${errorText}`);
      // 個別INSERT フォールバック
      for (const record of records) {
        const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(record),
        });
        if (singleRes.ok) {
          inserted++;
        } else {
          console.error(`  個別INSERT失敗 (${record.id}): ${await singleRes.text()}`);
        }
      }
      continue;
    }

    inserted += batch.length;
    console.log(`  進捗: ${inserted}/${target.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`orders投入成功: ${inserted}件`);
  console.log(`金額合計: ${matchedAmount.toLocaleString()}円`);
  console.log("em_order_stagingテーブルは監査用に保持しています。");
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
