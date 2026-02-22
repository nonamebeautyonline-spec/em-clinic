/**
 * 旧フォーマットのカルテ（「再処方承認」）を用量比較付きに差し替え
 * + intake に残っている「再処方承認」レコードも削除
 *
 * Usage: node scripts/fix-old-karte-format.cjs [--dry-run]
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

  // 1. reorders で旧フォーマット（「再処方承認」）の karte_note を持つものを取得
  const { data: oldKartes, error } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, paid_at, karte_note")
    .ilike("karte_note", "%再処方承認%")
    .order("paid_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("取得エラー:", error);
    return;
  }

  console.log(`旧フォーマットの karte_note: ${oldKartes.length}件\n`);

  // 全 paid reorder を取得（用量比較用）
  const { data: allPaid } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: true, nullsFirst: true });

  const paidByPatient = new Map();
  for (const r of allPaid || []) {
    if (!paidByPatient.has(r.patient_id)) paidByPatient.set(r.patient_id, []);
    paidByPatient.get(r.patient_id).push(r);
  }

  let fixed = 0;
  let errors = 0;

  for (const target of oldKartes) {
    const currentDose = extractDose(target.product_code);

    const patientHistory = paidByPatient.get(target.patient_id) || [];
    let prevDose = null;
    for (const r of patientHistory) {
      if (r.id === target.id) break;
      prevDose = extractDose(r.product_code);
    }

    const newNote = buildKarteNote(target.product_code, prevDose, currentDose);

    if (dryRun) {
      console.log(`  reorder#${target.id} PID=${target.patient_id} ${target.product_code} prev=${prevDose}mg→${currentDose}mg`);
      console.log(`    旧: ${target.karte_note.replace(/\n/g, " | ")}`);
      console.log(`    新: ${newNote.replace(/\n/g, " | ")}`);
      fixed++;
    } else {
      const { error: updateErr } = await sb
        .from("reorders")
        .update({ karte_note: newNote })
        .eq("id", target.id);

      if (updateErr) {
        console.error(`  [error] reorder#${target.id}:`, updateErr);
        errors++;
      } else {
        fixed++;
      }
    }
  }

  // 2. intake に残っている「再処方承認」レコードを削除
  const { data: intakeOld } = await sb
    .from("intake")
    .select("id, patient_id, note, created_at")
    .ilike("note", "%再処方承認%");

  console.log(`\nintake に残っている「再処方承認」レコード: ${(intakeOld || []).length}件`);

  let intakeDeleted = 0;
  for (const i of intakeOld || []) {
    if (dryRun) {
      console.log(`  intake#${i.id} PID=${i.patient_id} created=${i.created_at}`);
      intakeDeleted++;
    } else {
      const { error: delErr } = await sb.from("intake").delete().eq("id", i.id);
      if (delErr) {
        console.error(`  [error] intake#${i.id}:`, delErr);
      } else {
        intakeDeleted++;
      }
    }
  }

  console.log(`\n=== 結果 ===`);
  console.log(`reorders karte_note 差替: ${fixed}件`);
  if (errors > 0) console.log(`エラー: ${errors}件`);
  console.log(`intake「再処方承認」削除: ${intakeDeleted}件`);
  if (dryRun) console.log("(dry-run のため実際の変更はありません)");
}

main().catch(console.error);
