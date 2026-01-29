// check-reorder-333.mjs
// 再処方シート333行のLINE UID問題を調査

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

console.log('=== 再処方シート333行のLINE UID調査 ===\n');

// 1. 再処方シート333行を取得
console.log('1. 再処方シート333行を取得中...');
const reorderRes = await fetch(GAS_REORDER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'listAll', include_all: true })
});
const reorderText = await reorderRes.text();

console.log('Response status:', reorderRes.status);
console.log('Response preview:', reorderText.substring(0, 500));

let reorderData;
try {
  reorderData = JSON.parse(reorderText);
} catch (e) {
  console.error('Reorder JSON parse error:', e.message);
  console.error('Response text:', reorderText);
  process.exit(1);
}

console.log('Response structure:', Object.keys(reorderData));
console.log('reorderData.ok:', reorderData.ok);
console.log('reorderData.list type:', typeof reorderData.list);
console.log('reorderData.rows type:', typeof reorderData.rows);

const reorderRows = reorderData.reorders || reorderData.list || reorderData.rows || (Array.isArray(reorderData) ? reorderData : []);

if (!Array.isArray(reorderRows)) {
  console.error('reorderRows is not an array:', typeof reorderRows);
  console.error('Full response:', JSON.stringify(reorderData, null, 2).substring(0, 1000));
  process.exit(1);
}

console.log('Total reorders:', reorderRows.length);

// 333行目を探す方法を2つ試す
// 方法1: ID=333のレコード
const byId333 = reorderRows.find(r => r.id === "333" || r.id === 333);
// 方法2: 配列の332番目（333行目、0-indexed）
const byIndex333 = reorderRows[332];

console.log('Found by ID=333:', !!byId333);
console.log('Found by index 332:', !!byIndex333);

const row333 = byId333 || byIndex333;
if (!row333) {
  console.error('Row 333 not found by ID or index.');
  console.log('\n最初の5件:');
  reorderRows.slice(0, 5).forEach(r => {
    console.log(`  ID: ${r.id}, patient_id: ${r.patient_id}, line_uid: ${r.line_uid || '(なし)'}`);
  });
  console.log('\n最後の5件:');
  reorderRows.slice(-5).forEach(r => {
    console.log(`  ID: ${r.id}, patient_id: ${r.patient_id}, line_uid: ${r.line_uid || '(なし)'}`);
  });
  process.exit(1);
}

console.log('\n--- 再処方シート333行 ---');
console.log('patient_id:', row333.patient_id);
console.log('line_uid:', row333.line_uid || '(空白)');
console.log('product_code:', row333.product_code);
console.log('status:', row333.status);
console.log('timestamp:', row333.timestamp);

// 2. 問診シートで同じpatient_idを検索
console.log('\n2. 問診シートで patient_id =', row333.patient_id, 'を検索中...');
const intakeRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const intakeData = await intakeRes.json();
const intakeRows = intakeData.ok ? intakeData.rows : intakeData;

const intakeMatch = intakeRows.find(r => {
  const pid = String(r.patient_id || '').trim();
  const targetPid = String(row333.patient_id || '').trim();
  return pid === targetPid;
});

if (!intakeMatch) {
  console.error('\n❌ 問診シートに該当するpatient_idが見つかりません');
  process.exit(1);
}

console.log('\n--- 問診シート該当行 ---');
console.log('patient_id:', intakeMatch.patient_id);
console.log('line_id:', intakeMatch.line_id || '(空白)');
console.log('answerer_id:', intakeMatch.answerer_id || '(空白)');
console.log('patient_name:', intakeMatch.patient_name || intakeMatch.name);

// 3. 結果
console.log('\n=== 結果 ===');
if (intakeMatch.line_id && intakeMatch.line_id.trim() !== '') {
  console.log('✅ 問診シートにはLINE UIDが存在します:', intakeMatch.line_id);
  console.log('❌ しかし再処方シートには空白です');
  console.log('\n原因候補:');
  console.log('  1. 再処方申込時にloadLineAndLstepMapFromIntake_()がエラーを起こした');
  console.log('  2. patient_idの正規化処理（normPid_）で不一致が発生');
  console.log('  3. 再処方申込時点では問診シートにLINE UIDがまだなかった（後から追加された）');
  console.log('  4. INTAKE_SS_IDまたはINTAKE_SHEET_NAMEの設定が間違っている');
} else {
  console.log('⚠️  問診シートにもLINE UIDがありません');
  console.log('これは別の問題（LINE UID自動保存の問題）です');
}
