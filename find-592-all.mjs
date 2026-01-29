// find-592-all.mjs
// GASシート全体から20260101592を探す

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
const targetPid = "20260101592";

console.log('=== 全データから20260101592を検索 ===\n');

const gasRes = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

console.log(`総件数: ${gasRows.length}件\n`);

// 様々なフォーマットで検索
const candidates = [];

for (let i = 0; i < gasRows.length; i++) {
  const row = gasRows[i];
  const pid = row.patient_id;

  // そのまま比較
  if (pid === targetPid) {
    candidates.push({ index: i, row, match: 'exact' });
  }

  // 文字列化して比較
  if (String(pid) === targetPid) {
    candidates.push({ index: i, row, match: 'string' });
  }

  // トリムして比較
  if (String(pid).trim() === targetPid) {
    candidates.push({ index: i, row, match: 'trimmed' });
  }

  // 数値として比較
  if (Number(pid) === Number(targetPid)) {
    candidates.push({ index: i, row, match: 'number' });
  }

  // 部分一致
  if (String(pid).includes('592')) {
    candidates.push({ index: i, row, match: 'partial(592)' });
  }
}

console.log(`候補: ${candidates.length}件\n`);

if (candidates.length === 0) {
  console.log('❌ 見つかりませんでした\n');

  // 最新10件と最後10件を表示
  console.log('=== 先頭10件 ===');
  gasRows.slice(0, 10).forEach((r, i) => {
    console.log(`[${i}] patient_id: "${r.patient_id}" (型: ${typeof r.patient_id})`);
  });

  console.log('\n=== 最後10件 ===');
  gasRows.slice(-10).forEach((r, i) => {
    const actualIndex = gasRows.length - 10 + i;
    console.log(`[${actualIndex}] patient_id: "${r.patient_id}" (型: ${typeof r.patient_id})`);
  });

  process.exit(1);
}

// 候補を表示
for (const c of candidates) {
  console.log(`\n--- 候補 [${c.index}] (一致タイプ: ${c.match}) ---`);
  console.log('  patient_id:', c.row.patient_id, `(型: ${typeof c.row.patient_id})`);
  console.log('  patient_name:', c.row.patient_name || c.row.name || '(なし)');
  console.log('  sex:', c.row.sex || '(なし)');
  console.log('  birth:', c.row.birth || '(なし)');
  console.log('  name_kana:', c.row.name_kana || '(なし)');
  console.log('  tel:', c.row.tel || '(なし)');
  console.log('  answerer_id:', c.row.answerer_id || '(なし)');
  console.log('  line_id:', c.row.line_id || '(なし)');
}
