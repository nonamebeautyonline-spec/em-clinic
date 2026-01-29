// test-save-line-uid.mjs
// GASのsave_line_user_idエンドポイントをテスト

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

const GAS_MYPAGE_URL = envVars.GAS_MYPAGE_URL;

console.log('=== GAS save_line_user_id テスト ===\n');

// テスト用：実際の顧客データを使用
const testPatientId = "20251200007"; // LINE UID未登録の最初の顧客
const testLineUserId = "U_TEST_" + Date.now(); // テスト用LINE UID

console.log(`patient_id: ${testPatientId}`);
console.log(`line_user_id: ${testLineUserId}`);
console.log('');

try {
  const res = await fetch(GAS_MYPAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'save_line_user_id',
      patient_id: testPatientId,
      line_user_id: testLineUserId,
    }),
  });

  const text = await res.text();
  console.log(`HTTP Status: ${res.status}`);
  console.log(`Response: ${text}`);

  if (res.ok) {
    const json = JSON.parse(text);
    if (json.ok) {
      console.log('\n✅ 成功: LINE UIDが保存されました');
    } else {
      console.log(`\n❌ 失敗: ${json.error || json.message}`);
    }
  } else {
    console.log('\n❌ HTTPエラー');
  }
} catch (err) {
  console.error('\n❌ エラー:', err.message);
}
