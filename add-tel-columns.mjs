// add-tel-columns.mjs
// Supabaseのintakeテーブルにtelとverified_phoneカラムを追加

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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Adding tel and verified_phone columns ===\n');

// SQL to add columns
const sql = `
ALTER TABLE intake
ADD COLUMN IF NOT EXISTS tel TEXT,
ADD COLUMN IF NOT EXISTS verified_phone TEXT;
`;

try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('✅ Columns added successfully');
  } else {
    const error = await response.text();
    console.log('❌ Failed:', error);
    console.log('\nPlease add columns manually in Supabase UI:');
    console.log('1. Go to Table Editor > intake');
    console.log('2. Add column "tel" (type: text, nullable)');
    console.log('3. Add column "verified_phone" (type: text, nullable)');
  }
} catch (e) {
  console.log('❌ Error:', e.message);
  console.log('\nPlease add columns manually in Supabase UI:');
  console.log('1. Go to Table Editor > intake');
  console.log('2. Add column "tel" (type: text, nullable)');
  console.log('3. Add column "verified_phone" (type: text, nullable)');
}

console.log('\n=== Complete ===');
