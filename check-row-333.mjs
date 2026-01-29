// check-row-333.mjs
// 333行目（再処方顧客）のLINE UID状況を確認

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

console.log('=== 再処方シート確認 ===\n');

try {
  const res = await fetch(GAS_REORDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'list' })
  });

  const text = await res.text();
  console.log("Response status:", res.status);
  console.log("Response preview:", text.substring(0, 200));

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error:", e.message);
    process.exit(1);
  }

  console.log("Response keys:", Object.keys(data));

  const rows = Array.isArray(data) ? data : (data.ok ? data.rows : data.rows || []);

  if (!Array.isArray(rows)) {
    console.error("rows is not an array:", typeof rows);
    console.log("data:", JSON.stringify(data).substring(0, 500));
    process.exit(1);
  }

  console.log(`\n総件数: ${rows.length}件\n`);

  // 最近の再処方（先頭20件）でLINE UID未登録を確認
  const recent = rows.slice(0, 20);

  console.log("--- 最近の再処方（先頭20件）---");
  recent.forEach((r, i) => {
    const idx = i + 1;
    const pid = String(r.patient_id || r.patientId || "").padEnd(15);
    const luid = String(r.line_id || r.line_user_id || "").substring(0, 20);
    const aid = String(r.answerer_id || "").padEnd(12);
    const status = String(r.status || "").padEnd(10);

    console.log(`${idx.toString().padStart(3)}. PID: ${pid} | STATUS: ${status} | LUID: ${luid || "(なし)"} | AID: ${aid}`);
  });

  // LINE UID未登録の再処方を集計
  const noLineUid = rows.filter(r => {
    const luid = String(r.line_id || r.line_user_id || "").trim();
    return !luid || luid === "";
  });

  console.log(`\nLINE UID未登録の再処方: ${noLineUid.length}件 (${(noLineUid.length / rows.length * 100).toFixed(1)}%)`);

  // 最近の未登録（先頭10件）
  if (noLineUid.length > 0) {
    console.log("\n--- LINE UID未登録の再処方（先頭10件）---");
    noLineUid.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. PID: ${r.patient_id || r.patientId}, 日付: ${r.createdAt || r.created_at}, STATUS: ${r.status}`);
    });
  }

} catch (err) {
  console.error('❌ エラー:', err.message);
}
