// add-columns-via-api.mjs
// Next.js API経由でSupabaseにカラム追加

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

const ADMIN_TOKEN = envVars.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.log('❌ ADMIN_TOKEN not found in .env.local');
  process.exit(1);
}

const sql = `
ALTER TABLE intake
ADD COLUMN IF NOT EXISTS tel TEXT,
ADD COLUMN IF NOT EXISTS verified_phone TEXT;
`;

console.log('=== Adding columns to intake table ===\n');
console.log('SQL:', sql);
console.log('');

try {
  const response = await fetch('http://localhost:3000/api/admin/execute-sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({ sql })
  });

  const result = await response.json();

  if (response.ok && result.ok) {
    console.log('✅ Columns added successfully');
  } else {
    console.log('❌ Failed:', result.error || result.message);
  }
} catch (e) {
  console.log('❌ Error:', e.message);
  console.log('\nIs the Next.js dev server running? (npm run dev)');
}

console.log('\n=== Complete ===');
