// scripts/assign-none-mark.mjs
// patient_marks にレコードがない患者に「未対応」(none) マークを一括付与するスクリプト
//
// 使い方:
//   node scripts/assign-none-mark.mjs          # ドライラン（確認のみ）
//   node scripts/assign-none-mark.mjs --exec   # 実行

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local パース ──
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const dryRun = !process.argv.includes("--exec");

// ── ページネーション付き全件取得 ──
async function fetchAll(table, columns, filters) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) { console.error(`${table} 取得エラー:`, error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ── intake から全 patient_id を取得（重複除去） ──
const intakeRows = await fetchAll("intake", "patient_id");
const allPatientIds = [...new Set(intakeRows.map(r => r.patient_id).filter(Boolean))];
console.log(`intake 全患者数: ${allPatientIds.length}人`);

// ── patient_marks に既存レコードがある patient_id を取得 ──
const markRows = await fetchAll("patient_marks", "patient_id");
const markedIds = new Set(markRows.map(r => r.patient_id));
console.log(`patient_marks レコードあり: ${markedIds.size}人`);

// ── マークなし患者を抽出 ──
const unmarked = allPatientIds.filter(pid => !markedIds.has(pid));
console.log(`マークなし（未対応付与対象）: ${unmarked.length}人`);

if (unmarked.length === 0) {
  console.log("\n全患者に対応マークが付いています。処理不要です。");
  process.exit(0);
}

if (dryRun) {
  console.log(`\n[ドライラン] ${unmarked.length}人に "none"（未対応）マークを付与予定`);
  console.log("実行するには: node scripts/assign-none-mark.mjs --exec");
  process.exit(0);
}

// ── 一括 upsert（200件バッチ） ──
const BATCH = 200;
let inserted = 0;
let errors = 0;
const now = new Date().toISOString();

for (let i = 0; i < unmarked.length; i += BATCH) {
  const batch = unmarked.slice(i, i + BATCH);
  const rows = batch.map(pid => ({
    patient_id: pid,
    mark: "none",
    updated_at: now,
    updated_by: "bulk_assign",
  }));
  const { error } = await supabase
    .from("patient_marks")
    .upsert(rows, { onConflict: "patient_id" });
  if (error) {
    console.error(`  バッチ ${i}〜${i + batch.length} エラー:`, error.message);
    errors += batch.length;
  } else {
    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${unmarked.length} 完了\r`);
  }
}

console.log(`\n══════════════════════════════`);
console.log(`  結果`);
console.log(`══════════════════════════════`);
console.log(`  対象:     ${unmarked.length}人`);
console.log(`  成功:     ${inserted}件`);
console.log(`  エラー:   ${errors}件`);
console.log(`══════════════════════════════`);
