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
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const response = await fetch(
  `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.20260101584`,
  {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  }
);

const data = await response.json();

if (data.length > 0) {
  const row = data[0];
  console.log('【Supabase answers内の性別関連】');
  if (row.answers) {
    ['性別', 'sex', 'カナ', 'name_kana', 'tel', '電話番号', 'answerer_id'].forEach(key => {
      if (row.answers[key] !== undefined) {
        console.log(`  ${key}:`, row.answers[key]);
      }
    });
  }
}
