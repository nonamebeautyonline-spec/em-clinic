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
  SUPABASE_URL + '/rest/v1/intake?patient_id=eq.20260101585',
  {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  }
);

const data = await response.json();

if (data.length > 0) {
  const row = data[0];
  console.log('=== Supabase生データ ===');
  console.log('patient_id:', row.patient_id);
  console.log('patient_name:', row.patient_name);
  console.log('answerer_id (column):', row.answerer_id);
  console.log('');
  
  if (row.answers) {
    console.log('=== answers内容 ===');
    console.log('answers.sex:', row.answers.sex);
    console.log('answers.name_kana:', row.answers.name_kana);
    console.log('answers.answerer_id:', row.answers.answerer_id);
    console.log('answers.tel:', row.answers.tel);
    console.log('');
    console.log('=== answersのJSON（最初の1500文字） ===');
    console.log(JSON.stringify(row.answers, null, 2).substring(0, 1500));
  }
} else {
  console.log('❌ Supabaseにデータなし');
}
