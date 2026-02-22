/**
 * マッチなし44件の内訳を調査
 * 同じ patient_id の reorder が存在するか（status問わず）確認
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

const PRODUCT_NAME_TO_CODE = {
  "マンジャロ 2.5mg 1ヶ月": "MJL_2.5mg_1m",
  "マンジャロ 2.5mg 2ヶ月": "MJL_2.5mg_2m",
  "マンジャロ 2.5mg 3ヶ月": "MJL_2.5mg_3m",
  "マンジャロ 5mg 1ヶ月": "MJL_5mg_1m",
  "マンジャロ 5mg 2ヶ月": "MJL_5mg_2m",
  "マンジャロ 5mg 3ヶ月": "MJL_5mg_3m",
  "マンジャロ 7.5mg 1ヶ月": "MJL_7.5mg_1m",
  "マンジャロ 7.5mg 2ヶ月": "MJL_7.5mg_2m",
  "マンジャロ 7.5mg 3ヶ月": "MJL_7.5mg_3m",
  "マンジャロ 10mg 1ヶ月": "MJL_10mg_1m",
  "マンジャロ 10mg 2ヶ月": "MJL_10mg_2m",
  "マンジャロ 10mg 3ヶ月": "MJL_10mg_3m",
};

function extractProductCode(note) {
  if (!note) return null;
  for (const [name, code] of Object.entries(PRODUCT_NAME_TO_CODE)) {
    if (note.includes(name)) return code;
  }
  return null;
}

async function main() {
  // paid reorder を全取得
  const { data: paidReorders } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, status, karte_note")
    .eq("status", "paid");

  const paidSet = new Set((paidReorders || []).map(r => `${r.patient_id}:${r.product_code}`));
  const paidByPatient = new Map();
  for (const r of paidReorders || []) {
    if (!paidByPatient.has(r.patient_id)) paidByPatient.set(r.patient_id, []);
    paidByPatient.get(r.patient_id).push(r);
  }

  // ALL reorder（status問わず）
  const { data: allReorders } = await sb
    .from("reorders")
    .select("id, patient_id, product_code, status, karte_note");

  const allByPatient = new Map();
  for (const r of allReorders || []) {
    if (!allByPatient.has(r.patient_id)) allByPatient.set(r.patient_id, []);
    allByPatient.get(r.patient_id).push(r);
  }

  // intake カルテ
  const { data: karteIntakes } = await sb
    .from("intake")
    .select("id, patient_id, note, created_at")
    .ilike("note", "%再処方決済%");

  // v2 と同じロジックでマッチしなかったものを特定
  const usedReorders = new Set();
  const unmatched = [];

  for (const intake of karteIntakes || []) {
    const patientPaid = paidByPatient.get(intake.patient_id) || [];
    const productCode = extractProductCode(intake.note);
    const karteTime = new Date(intake.created_at).getTime();

    let matched = false;

    // 戦略1: paid_at time match
    for (const r of patientPaid) {
      if (usedReorders.has(r.id) || r.karte_note) continue;
      if (r.paid_at) {
        const diff = Math.abs(new Date(r.paid_at).getTime() - karteTime);
        if (diff <= 60 * 60 * 1000) { usedReorders.add(r.id); matched = true; break; }
      }
    }

    // 戦略2: product match
    if (!matched && productCode) {
      for (const r of patientPaid) {
        if (usedReorders.has(r.id) || r.karte_note) continue;
        if (r.product_code === productCode) { usedReorders.add(r.id); matched = true; break; }
      }
    }

    // 戦略3: single
    if (!matched) {
      const unused = patientPaid.filter(r => !usedReorders.has(r.id) && !r.karte_note);
      if (unused.length === 1) { usedReorders.add(unused[0].id); matched = true; }
    }

    if (!matched) {
      unmatched.push(intake);
    }
  }

  console.log(`=== マッチなし ${unmatched.length}件の詳細 ===\n`);

  let hasAnyReorder = 0;
  let noReorderAtAll = 0;

  for (const intake of unmatched) {
    const productCode = extractProductCode(intake.note);
    const allForPatient = allByPatient.get(intake.patient_id) || [];
    const paidForPatient = paidByPatient.get(intake.patient_id) || [];

    if (allForPatient.length === 0) {
      noReorderAtAll++;
      console.log(`  intake#${intake.id} PID=${intake.patient_id} product=${productCode} → reorder自体なし`);
    } else {
      hasAnyReorder++;
      const statuses = allForPatient.map(r => `${r.product_code}(${r.status}${r.karte_note ? ',has_karte' : ''})`).join(", ");
      console.log(`  intake#${intake.id} PID=${intake.patient_id} product=${productCode} → reorder: [${statuses}]  paid=${paidForPatient.length}件`);
    }
  }

  console.log(`\n=== 内訳 ===`);
  console.log(`reorder自体なし: ${noReorderAtAll}件`);
  console.log(`reorderあるが paid でマッチ済み: ${hasAnyReorder}件`);
}

main().catch(console.error);
