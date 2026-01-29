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

const pids = ['20260101583', '20260101584'];

for (const pid of pids) {
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/intake?patient_id=eq.' + pid,
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
    console.log('PID:', pid);
    console.log('  patient_name:', row.patient_name);
    console.log('  answerer_id (column):', row.answerer_id || '(空)');
    const answererId = row.answers && row.answers.answerer_id;
    console.log('  answers.answerer_id:', answererId || '(空)');
    const tel = row.answers && row.answers.tel;
    console.log('  answers.tel:', tel || '(空)');
    console.log('');
  }
}
