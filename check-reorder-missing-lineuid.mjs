// check-reorder-missing-lineuid.mjs
// 再処方シートでLINE UID未登録のレコードを確認

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

const GAS_REORDER_URL = envVars.GAS_REORDER_URL;
const GAS_INTAKE_URL = envVars.GAS_INTAKE_LIST_URL;

console.log('=== 再処方シートLINE UID未登録レコード調査 ===\n');

// 1. 再処方シート全件取得
console.log('1. 再処方シート全件取得中...');
const reorderRes = await fetch(GAS_REORDER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'listAll', include_all: true })
});
const reorderData = await reorderRes.json();
const reorderRows = reorderData.reorders || [];

console.log(`総レコード数: ${reorderRows.length}件\n`);

// 2. LINE UID未登録のレコードを抽出
const noLineUid = reorderRows.filter(r => !r.line_uid || String(r.line_uid).trim() === "");

console.log(`LINE UID未登録: ${noLineUid.length}件 (${(noLineUid.length / reorderRows.length * 100).toFixed(1)}%)\n`);

// 3. 問診シートを取得
console.log('2. 問診シート取得中...');
const intakeRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const intakeData = await intakeRes.json();
const intakeRows = intakeData.ok ? intakeData.rows : intakeData;

// 4. 問診シートにはLINE UIDがあるのに再処方シートにはないケースを確認
console.log('3. 問診シートとの照合中...\n');

const canFix = [];
const cannotFix = [];

for (const reorder of noLineUid) {
  const intakeMatch = intakeRows.find(r => {
    const pid = String(r.patient_id || '').trim();
    const targetPid = String(reorder.patient_id || '').trim();
    return pid === targetPid;
  });

  if (intakeMatch && intakeMatch.line_id && intakeMatch.line_id.trim() !== '') {
    // 問診シートにはLINE UIDがある
    canFix.push({
      id: reorder.id,
      patient_id: reorder.patient_id,
      patient_name: reorder.patient_name,
      timestamp: reorder.timestamp,
      status: reorder.status,
      line_id_in_intake: intakeMatch.line_id
    });
  } else {
    // 問診シートにもLINE UIDがない
    cannotFix.push({
      id: reorder.id,
      patient_id: reorder.patient_id,
      patient_name: reorder.patient_name,
      timestamp: reorder.timestamp,
      status: reorder.status
    });
  }
}

console.log('=== 結果 ===\n');

console.log(`✅ 問診シートからコピー可能: ${canFix.length}件`);
if (canFix.length > 0) {
  console.log('\n--- コピー可能な先頭10件 ---');
  canFix.slice(0, 10).forEach(r => {
    console.log(`ID: ${r.id}, PID: ${r.patient_id}, 氏名: ${r.patient_name}, 日時: ${r.timestamp}`);
    console.log(`  -> LINE UID: ${r.line_id_in_intake.substring(0, 20)}...`);
  });
}

console.log(`\n❌ 問診シートにもない: ${cannotFix.length}件`);
if (cannotFix.length > 0) {
  console.log('\n--- 問診シートにもない先頭5件 ---');
  cannotFix.slice(0, 5).forEach(r => {
    console.log(`ID: ${r.id}, PID: ${r.patient_id}, 氏名: ${r.patient_name}, 日時: ${r.timestamp}`);
  });
}

console.log('\n=== 推奨対応 ===');
if (canFix.length > 0) {
  console.log(`1. ${canFix.length}件のLINE UIDを問診シートから再処方シートにコピーする一括更新スクリプトを作成`);
  console.log('2. 再処方GASに「LINE UID同期」機能を追加（既存レコードを問診シートから更新）');
}
if (cannotFix.length > 0) {
  console.log(`3. ${cannotFix.length}件については、患者が次回マイページにアクセスした時に自動保存される`);
}
