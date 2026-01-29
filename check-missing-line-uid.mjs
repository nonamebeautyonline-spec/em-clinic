// check-missing-line-uid.mjs
// LINE UIDが未登録の顧客を確認

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

console.log('=== LINE UID未登録顧客の確認 ===\n');

const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`総顧客数: ${gasRows.length}件\n`);

// LINE UIDが無い顧客をカウント
const noLineUid = gasRows.filter(r => !r.line_id || String(r.line_id).trim() === "");

console.log(`LINE UID未登録: ${noLineUid.length}件 (${(noLineUid.length / gasRows.length * 100).toFixed(1)}%)\n`);

// 最近の顧客（2026年1月以降）でLINE UIDが無い人
const recent = noLineUid.filter(r => {
  const pid = String(r.patient_id || "");
  return pid.startsWith("202601");
});

console.log(`2026年1月の顧客でLINE UID未登録: ${recent.length}件`);

if (recent.length > 0) {
  console.log("\n--- 最近の未登録顧客（先頭10件）---");
  recent.slice(0, 10).forEach(r => {
    console.log(`PID: ${r.patient_id}, 氏名: ${r.patient_name || r.name}, 予約日: ${r.reserved_date}`);
  });
}

// answerer_idがあるのにline_idが無い人（LINE経由のはず）
const hasAnswererIdButNoLineId = noLineUid.filter(r => {
  const aid = String(r.answerer_id || "").trim();
  return aid && aid !== "";
});

console.log(`\nanswerer_idはあるがLINE UIDが無い: ${hasAnswererIdButNoLineId.length}件`);

if (hasAnswererIdButNoLineId.length > 0) {
  console.log("\n--- answerer_id有・LINE UID無（先頭10件）---");
  hasAnswererIdButNoLineId.slice(0, 10).forEach(r => {
    console.log(`PID: ${r.patient_id}, 氏名: ${r.patient_name || r.name}, answerer_id: ${r.answerer_id}`);
  });
}
