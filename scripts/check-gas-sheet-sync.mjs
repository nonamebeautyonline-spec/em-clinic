#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...valueParts] = trimmed.split('=');
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const GAS_URL = envVars.GAS_BANK_TRANSFER_URL;

console.log('=== GASシート同期状況確認 ===\n');

// 確認したい患者IDリスト
const targetPatientIds = [
  '20260101497',  // ID: 42
  '20260101669',  // ID: 45
  '20260100379',  // ID: 47
  '20260101605',  // ID: 48
  '20251201077',  // ID: 49
  '20260101638',  // ID: 50
  '20260101613',  // ID: 51
];

// 2026-01のシートを確認
console.log('📋 2026-01 住所情報シートを確認中...\n');

try {
  const payload = {
    type: "check_sheet",
    year_month: "2026-01",
    patient_ids: targetPatientIds
  };

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    console.log('❌ HTTPエラー:', response.status);
    console.log(text);
  } else {
    const json = JSON.parse(text);

    if (json.ok) {
      console.log(`✅ シート: ${json.sheet}`);
      console.log(`   総行数: ${json.total_rows}行`);
      console.log(`   該当データ: ${json.found_count}件\n`);

      if (json.found && json.found.length > 0) {
        console.log('=== 見つかったデータ ===');
        json.found.forEach((item) => {
          console.log(`[行${item.row}] 患者ID: ${item.patient_id}`);
          console.log(`        口座名義: ${item.account_name}`);
          console.log(`        受信日時: ${item.received_at}`);
          console.log('');
        });
      } else {
        console.log('❌ 該当する患者IDのデータが見つかりませんでした');
      }

      // 見つからなかった患者IDをリストアップ
      const foundIds = new Set((json.found || []).map(f => f.patient_id));
      const notFound = targetPatientIds.filter(id => !foundIds.has(id));

      if (notFound.length > 0) {
        console.log('\n⚠️  2026-01シートに見つからなかった患者ID:');
        notFound.forEach(id => console.log(`   - ${id}`));
      }
    } else {
      console.log('❌ GASエラー:', json.error);
    }
  }
} catch (error) {
  console.error('❌ エラー:', error.message);
}

// 2026-02のシートも確認
console.log('\n📋 2026-02 住所情報シートを確認中...\n');

try {
  const payload = {
    type: "check_sheet",
    year_month: "2026-02",
    patient_ids: targetPatientIds
  };

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    console.log('❌ HTTPエラー:', response.status);
    console.log(text);
  } else {
    const json = JSON.parse(text);

    if (json.ok) {
      console.log(`✅ シート: ${json.sheet}`);
      console.log(`   総行数: ${json.total_rows}行`);
      console.log(`   該当データ: ${json.found_count}件\n`);

      if (json.found && json.found.length > 0) {
        console.log('=== 見つかったデータ ===');
        json.found.forEach((item) => {
          console.log(`[行${item.row}] 患者ID: ${item.patient_id}`);
          console.log(`        口座名義: ${item.account_name}`);
          console.log(`        受信日時: ${item.received_at}`);
          console.log('');
        });
      } else {
        console.log('❌ 該当する患者IDのデータが見つかりませんでした');
      }

      // 見つからなかった患者IDをリストアップ
      const foundIds = new Set((json.found || []).map(f => f.patient_id));
      const notFound = targetPatientIds.filter(id => !foundIds.has(id));

      if (notFound.length > 0) {
        console.log('\n⚠️  2026-02シートに見つからなかった患者ID:');
        notFound.forEach(id => console.log(`   - ${id}`));
      }
    } else {
      console.log('❌ GASエラー:', json.error);
    }
  }
} catch (error) {
  console.error('❌ エラー:', error.message);
}
