// scripts/verify-em-migration.ts
// EMオンラインクリニック: 移行データの整合性検証
//
// 使い方:
//   npx tsx scripts/verify-em-migration.ts --tenant-id <UUID>

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

if (!tenantId) {
  console.error("使い方: npx tsx scripts/verify-em-migration.ts --tenant-id <UUID>");
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

async function supabaseCount(table: string, filter: string): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}&select=id&limit=0`;
  const res = await fetch(url, {
    method: "HEAD",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "count=exact",
    },
  });
  if (!res.ok) throw new Error(`COUNT ${table} 失敗: ${res.status}`);
  const range = res.headers.get("content-range");
  if (!range) return 0;
  const match = range.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

type CheckResult = {
  name: string;
  status: "OK" | "WARN" | "FAIL";
  detail: string;
};

async function main() {
  console.log("=== EMオンラインクリニック 移行検証 ===");
  console.log(`テナントID: ${tenantId}\n`);

  const checks: CheckResult[] = [];

  // 1. テナント存在確認
  const tenants = await supabaseGet<{ id: string; slug: string; name: string }>(
    "tenants",
    `select=id,slug,name&id=eq.${tenantId}`,
  );
  if (tenants.length === 0) {
    checks.push({ name: "テナント存在", status: "FAIL", detail: `テナント ${tenantId} が見つかりません` });
    printResults(checks);
    return;
  }
  checks.push({ name: "テナント存在", status: "OK", detail: `${tenants[0].slug} (${tenants[0].name})` });

  // 2. 患者数
  const patientCount = await supabaseCount("patients", `tenant_id=eq.${tenantId}`);
  checks.push({
    name: "患者数",
    status: patientCount > 0 ? "OK" : "WARN",
    detail: `${patientCount.toLocaleString()}件`,
  });

  // 電話番号なし患者
  const noPhoneCount = await supabaseCount("patients", `tenant_id=eq.${tenantId}&tel=is.null`);
  checks.push({
    name: "電話番号なし患者",
    status: noPhoneCount === 0 ? "OK" : "WARN",
    detail: `${noPhoneCount}件${noPhoneCount > 0 ? " (照合に影響する可能性)" : ""}`,
  });

  // 3. 問診数
  const intakeCount = await supabaseCount("intake", `tenant_id=eq.${tenantId}`);
  checks.push({
    name: "問診数",
    status: intakeCount > 0 ? "OK" : "WARN",
    detail: `${intakeCount.toLocaleString()}件`,
  });

  // 4. 注文数
  const orderCount = await supabaseCount("orders", `tenant_id=eq.${tenantId}`);
  checks.push({
    name: "注文数",
    status: orderCount > 0 ? "OK" : "WARN",
    detail: `${orderCount.toLocaleString()}件`,
  });

  // 注文のpatient_id NULLチェック
  const nullPidOrders = await supabaseCount("orders", `tenant_id=eq.${tenantId}&patient_id=is.null`);
  checks.push({
    name: "patient_id NULL注文",
    status: nullPidOrders === 0 ? "OK" : "FAIL",
    detail: `${nullPidOrders}件`,
  });

  // 5. ステージングテーブル
  try {
    const stagingTotal = await supabaseCount("em_order_staging", `tenant_id=eq.${tenantId}`);
    const stagingMatched = await supabaseCount("em_order_staging", `tenant_id=eq.${tenantId}&matched_patient_id=not.is.null`);
    const stagingUnmatched = stagingTotal - stagingMatched;

    checks.push({
      name: "ステージング総件数",
      status: "OK",
      detail: `${stagingTotal.toLocaleString()}件`,
    });
    checks.push({
      name: "ステージング紐付け済み",
      status: stagingTotal > 0 ? "OK" : "WARN",
      detail: `${stagingMatched.toLocaleString()}件 (${stagingTotal > 0 ? Math.round(stagingMatched / stagingTotal * 100) : 0}%)`,
    });
    checks.push({
      name: "ステージング未紐付け",
      status: stagingUnmatched === 0 ? "OK" : "WARN",
      detail: `${stagingUnmatched.toLocaleString()}件`,
    });

    // 注文数 vs ステージング紐付け済み数の比較
    if (orderCount > 0 && stagingMatched > 0) {
      const diff = Math.abs(orderCount - stagingMatched);
      checks.push({
        name: "注文数≒ステージング照合数",
        status: diff === 0 ? "OK" : "WARN",
        detail: `orders: ${orderCount} / staging紐付け: ${stagingMatched} (差分: ${diff})`,
      });
    }
  } catch {
    checks.push({ name: "ステージングテーブル", status: "WARN", detail: "テーブルが存在しないか、アクセスできません" });
  }

  // 6. tenant_id整合性（他テナントのデータ混入チェック）
  // ordersにEMテナント以外のtenant_idがないか
  const orders = await supabaseGet<{ tenant_id: string }>(
    "orders",
    `select=tenant_id&patient_id=like.EM-*&tenant_id=neq.${tenantId}&limit=1`,
  );
  checks.push({
    name: "tenant_id整合性",
    status: orders.length === 0 ? "OK" : "FAIL",
    detail: orders.length === 0 ? "異常なし" : "他テナントのtenant_idが混入しています",
  });

  // 7. 金額合計（ordersとステージングの比較）
  try {
    const stagingAmounts = await supabaseGet<{ amount: number }>(
      "em_order_staging",
      `select=amount&tenant_id=eq.${tenantId}&matched_patient_id=not.is.null&limit=100000`,
    );
    const stagingTotal = stagingAmounts.reduce((sum, s) => sum + (s.amount || 0), 0);

    const orderAmounts = await supabaseGet<{ amount: number }>(
      "orders",
      `select=amount&tenant_id=eq.${tenantId}&limit=100000`,
    );
    const orderTotal = orderAmounts.reduce((sum, o) => sum + (o.amount || 0), 0);

    checks.push({
      name: "金額合計比較",
      status: stagingTotal === orderTotal ? "OK" : "WARN",
      detail: `staging: ${stagingTotal.toLocaleString()}円 / orders: ${orderTotal.toLocaleString()}円`,
    });
  } catch {
    // ステージングテーブルがない場合はスキップ
  }

  printResults(checks);
}

function printResults(checks: CheckResult[]) {
  console.log("\n=== 検証結果 ===\n");
  const maxNameLen = Math.max(...checks.map((c) => c.name.length));

  for (const c of checks) {
    const icon = c.status === "OK" ? "[OK]  " : c.status === "WARN" ? "[WARN]" : "[FAIL]";
    const name = c.name.padEnd(maxNameLen + 2);
    console.log(`${icon} ${name} ${c.detail}`);
  }

  const fails = checks.filter((c) => c.status === "FAIL");
  const warns = checks.filter((c) => c.status === "WARN");
  console.log(`\n結果: ${checks.length}項目中 OK=${checks.length - fails.length - warns.length} WARN=${warns.length} FAIL=${fails.length}`);

  if (fails.length > 0) {
    console.log("\nFAILの項目を確認してください:");
    for (const f of fails) {
      console.log(`  - ${f.name}: ${f.detail}`);
    }
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
