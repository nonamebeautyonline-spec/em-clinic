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

const patientId = '20251200404';
const adminToken = envVars.ADMIN_TOKEN;

console.log('=== キャッシュクリア ===');
console.log(`患者ID: ${patientId}\n`);

const response = await fetch('http://localhost:3000/api/admin/invalidate-cache', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ patient_id: patientId }),
});

const text = await response.text();
console.log(`ステータス: ${response.status}`);
console.log(`レスポンス: ${text}`);
