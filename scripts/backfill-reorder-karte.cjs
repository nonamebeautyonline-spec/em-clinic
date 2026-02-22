/**
 * paid reorder で karte_note が未設定のものにカルテをバックフィル
 * buildKarteNote と同じロジック（用量比較）で生成
 *
 * Usage: node scripts/backfill-reorder-karte.cjs [--dry-run]
 */
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const dryRun = process.argv.includes("--dry-run");

// lib/patient-utils の formatProductCode 相当
const PRODUCT_NAMES = {
  "MJL_2.5mg_1m": "マンジャロ 2.5mg 1ヶ月",
  "MJL_2.5mg_2m": "マンジャロ 2.5mg 2ヶ月",
  "MJL_2.5mg_3m": "マンジャロ 2.5mg 3ヶ月",
  "MJL_5mg_1m": "マンジャロ 5mg 1ヶ月",
  "MJL_5mg_2m": "マンジャロ 5mg 2ヶ月",
  "MJL_5mg_3m": "マンジャロ 5mg 3ヶ月",
  "MJL_7.5mg_1m": "マンジャロ 7.5mg 1ヶ月",
  "MJL_7.5mg_2m": "マンジャロ 7.5mg 2ヶ月",
  "MJL_7.5mg_3m": "マンジャロ 7.5mg 3ヶ月",
  "MJL_10mg_1m": "マンジャロ 10mg 1ヶ月",
  "MJL_10mg_2m": "マンジャロ 10mg 2ヶ月",
  "MJL_10mg_3m": "マンジャロ 10mg 3ヶ月",
};

function formatProductCode(code) {
  return PRODUCT_NAMES[code] || code || "";
}

function extractDose(productCode) {
  const m = (productCode || "").match(/(\d+\.?\d*)mg/);
  return m ? parseFloat(m[1]) : null;
}

function buildKarteNote(productCode, prevDose, currentDose) {
  const productName = formatProductCode(productCode);
  let reason;
  if (prevDose == null || currentDose == null) {
    reason = "副作用がなく、継続使用のため処方";
  } else if (currentDose > prevDose) {
    reason = "副作用がなく、効果を感じづらくなり増量処方";
  } else if (currentDose < prevDose) {
    reason = "副作用がなく、効果も十分にあったため減量処方";
  } else {
    reason = "副作用がなく、継続使用のため処方";
  }
  return `再処方決済\n商品: ${productName}\n${reason}`;
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE RUN ===");

  // karte_note が null の paid reorder を取得
  const { data: targets, error } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, paid_at, created_at")
    .eq("status", "paid")
    .is("karte_note", null)
    .order("paid_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("取得エラー:", error);
    return;
  }

  console.log(`karte_note 未設定の paid reorder: ${targets.length}件\n`);

  // 全 paid reorder を patient_id 別に取得（用量比較用）
  const { data: allPaid } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: true, nullsFirst: true });

  // patient_id → paid reorders (時系列順)
  const paidByPatient = new Map();
  for (const r of allPaid || []) {
    if (!paidByPatient.has(r.patient_id)) paidByPatient.set(r.patient_id, []);
    paidByPatient.get(r.patient_id).push(r);
  }

  let filled = 0;
  let errors = 0;

  for (const target of targets) {
    const currentDose = extractDose(target.product_code);

    // 同じ patient の paid reorder のうち、自分より前のものから前回用量を取得
    const patientHistory = paidByPatient.get(target.patient_id) || [];
    let prevDose = null;
    for (const r of patientHistory) {
      if (r.id === target.id) break; // 自分に到達したら終了
      prevDose = extractDose(r.product_code); // 最後に見つかったものが直前
    }

    const note = buildKarteNote(target.product_code, prevDose, currentDose);

    if (dryRun) {
      console.log(`  reorder#${target.id} PID=${target.patient_id} ${target.product_code} prev=${prevDose}mg→${currentDose}mg`);
      filled++;
    } else {
      const { error: updateErr } = await sb
        .from("reorders")
        .update({ karte_note: note })
        .eq("id", target.id);

      if (updateErr) {
        console.error(`  [error] reorder#${target.id}:`, updateErr);
        errors++;
      } else {
        filled++;
      }
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`バックフィル: ${filled}件`);
  if (errors > 0) console.log(`エラー: ${errors}件`);
  if (dryRun) console.log("(dry-run のため実際の変更はありません)");
}

main().catch(console.error);
