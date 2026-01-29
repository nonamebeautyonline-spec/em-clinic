// check-line-id-format.mjs
// LINE UIDとanswerer_idの関係を確認

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

console.log('=== LINE IDの形式確認 ===\n');

const gasResponse = await fetch(GAS_INTAKE_URL, { method: 'GET' });
const gasData = await gasResponse.json();
const gasRows = gasData.ok ? gasData.rows : gasData;

// LINE UIDが登録されている顧客を抽出
const hasLineUid = gasRows.filter(r => {
  const luid = String(r.line_id || "").trim();
  return luid && luid !== "";
});

console.log(`LINE UID登録済み: ${hasLineUid.length}件\n`);

// サンプル表示（先頭10件）
console.log("--- LINE UID形式のサンプル ---");
hasLineUid.slice(0, 10).forEach((r, i) => {
  const aid = String(r.answerer_id || "").padEnd(15);
  const luid = String(r.line_id || "").substring(0, 35);
  console.log(`${i + 1}. answerer_id: ${aid} | line_id: ${luid}`);
});

// answerer_idの形式を確認
const answererIdFormats = {
  numeric: 0,      // 数字のみ
  uPrefix: 0,      // Uから始まる
  other: 0
};

hasLineUid.forEach(r => {
  const aid = String(r.answerer_id || "").trim();
  if (!aid) return;

  if (/^[0-9]+$/.test(aid)) {
    answererIdFormats.numeric++;
  } else if (aid.startsWith('U')) {
    answererIdFormats.uPrefix++;
  } else {
    answererIdFormats.other++;
  }
});

console.log("\n--- answerer_idの形式 ---");
console.log(`数字のみ: ${answererIdFormats.numeric}件`);
console.log(`Uから始まる: ${answererIdFormats.uPrefix}件`);
console.log(`その他: ${answererIdFormats.other}件`);

// line_idの形式を確認
const lineIdFormats = {
  uPrefix: 0,      // Uから始まる（33文字）
  other: 0
};

hasLineUid.forEach(r => {
  const luid = String(r.line_id || "").trim();
  if (!luid) return;

  if (luid.startsWith('U') && luid.length === 33) {
    lineIdFormats.uPrefix++;
  } else {
    lineIdFormats.other++;
  }
});

console.log("\n--- line_idの形式 ---");
console.log(`Uから始まる33文字: ${lineIdFormats.uPrefix}件`);
console.log(`その他: ${lineIdFormats.other}件`);

// answerer_idとline_idが一致するケースを確認
const matching = hasLineUid.filter(r => {
  const aid = String(r.answerer_id || "").trim();
  const luid = String(r.line_id || "").trim();
  return aid === luid;
});

console.log(`\nanswerer_id === line_id: ${matching.length}件`);

if (matching.length > 0) {
  console.log("\n✅ answerer_idとline_idが同じIDです！");
} else {
  console.log("\n❌ answerer_idとline_idは別のIDです");
  console.log("   → Messaging API の /followers/ids では取得できません");
}
