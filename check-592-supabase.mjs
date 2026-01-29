import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const pid = "20260101592";

const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, answerer_id, line_id, created_at')
  .eq('patient_id', pid)
  .single();

if (error) {
  console.log('❌ Supabaseに存在しません:', error.message);
} else {
  console.log('✅ Supabaseに存在します');
  console.log('  patient_id:', data.patient_id);
  console.log('  patient_name:', data.patient_name || '(なし)');
  console.log('  answerer_id:', data.answerer_id || '(なし)');
  console.log('  line_id:', data.line_id || '(なし)');
  console.log('  created_at:', new Date(data.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
}
