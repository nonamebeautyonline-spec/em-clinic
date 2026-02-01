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

const patientIds = [
  '20260101527', '20260101427', '20251200009', '20260101497',
  '20260101089', '20260101576', '20260101558', '20260101669',
  '20260101520', '20260101571', '20260101589', '20260101620',
  '20260101579', '20260101615', '20260101287', '20260101509',
  '20251200404', '20251200394', '20260100482', '20260101422',
  '20260100903', '20260101353'
];

console.log(`=== ${patientIds.length}人の患者キャッシュを無効化 ===\n`);

const invalidateUrl = 'http://localhost:3000/api/admin/invalidate-cache';
const adminToken = envVars.ADMIN_TOKEN;

if (!adminToken) {
  console.error('❌ ADMIN_TOKEN not set');
  process.exit(1);
}

let successCount = 0;
let errorCount = 0;

for (const patientId of patientIds) {
  try {
    const response = await fetch(invalidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ patient_id: patientId })
    });

    if (response.ok) {
      console.log(`✅ ${patientId}: キャッシュ削除成功`);
      successCount++;
    } else {
      console.log(`❌ ${patientId}: HTTP ${response.status}`);
      errorCount++;
    }
  } catch (e) {
    console.log(`❌ ${patientId}: ${e.message}`);
    errorCount++;
  }
}

console.log(`\n=== 完了 ===`);
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
