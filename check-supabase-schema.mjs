// check-supabase-schema.mjs
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

console.log('=== Supabase Error Analysis ===\n');

// 3人の患者データで失敗をシミュレート
const testPatients = [
  { patient_id: '20260101541', name: '久保田　理恵', answerer_id: '234558702' },
  { patient_id: '20260101551', name: '成瀬美愛', answerer_id: '234577208' },
  { patient_id: '20251200673', name: '久保　美那保', answerer_id: '229919826' }
];

for (const p of testPatients) {
  console.log(`Patient: ${p.patient_id} - ${p.name}`);
  const { data, error } = await supabase
    .from('intake')
    .select('patient_id, patient_name, answerer_id')
    .eq('patient_id', p.patient_id)
    .single();
  
  if (error) {
    console.log('  ❌ Error:', error.message);
  } else {
    console.log('  ✅ Found in Supabase');
  }
}
