// get-587-from-gas.mjs
// GASシートから患者20260101587の完全な情報を取得

import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== 患者20260101587の情報（GAS）===\n');

const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

const patient = gasRows.find(r => String(r.patient_id) === "20260101587");

if (!patient) {
  console.log("❌ 患者が見つかりません");
  process.exit(1);
}

console.log("基本情報:");
console.log("  patient_id:", patient.patient_id);
console.log("  patient_name:", patient.patient_name || patient.name);
console.log("  reserved_date:", patient.reserved_date);
console.log("  reserved_time:", patient.reserved_time);
console.log("  reserve_id:", patient.reserveId || patient.reserve_id);
console.log("  status:", patient.status || "(なし)");
console.log("");

console.log("問診マスター情報:");
console.log("  氏名:", patient.氏名 || patient.name);
console.log("  カナ:", patient.カナ || patient.name_kana || "(なし)");
console.log("  性別:", patient.性別 || patient.sex || "(なし)");
console.log("  生年月日:", patient.生年月日 || patient.birth || "(なし)");
console.log("  電話番号:", patient.電話番号 || patient.tel || "(なし)");
console.log("  answerer_id:", patient.answerer_id || "(なし)");
console.log("  line_id:", patient.line_id || "(なし)");
console.log("");

console.log("問診内容:");
console.log("  ng_check:", patient.ng_check);
console.log("  current_disease_yesno:", patient.current_disease_yesno);
console.log("  glp_history:", patient.glp_history);
console.log("  med_yesno:", patient.med_yesno);
console.log("  med_detail:", patient.med_detail);
console.log("  allergy_yesno:", patient.allergy_yesno);
console.log("  entry_route:", patient.entry_route);

// JSONとして出力（スクリプトで使いやすいように）
console.log("\n--- JSON ---");
console.log(JSON.stringify({
  name: patient.patient_name || patient.name || patient.氏名,
  nameKana: patient.カナ || patient.name_kana || "",
  sex: patient.性別 || patient.sex || "",
  birth: patient.生年月日 || patient.birth || "",
  tel: patient.電話番号 || patient.tel || "",
  answererId: patient.answerer_id || "",
  lineUserId: patient.line_id || ""
}, null, 2));
