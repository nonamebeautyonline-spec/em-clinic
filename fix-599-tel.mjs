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

const pid = '20260101599';
const tel = '08079897115';

console.log(`=== Patient ${pid} 電話番号を補完 ===`);
console.log(`  tel: ${tel}\n`);

const { data: existing } = await supabase
  .from('intake')
  .select('answers')
  .eq('patient_id', pid)
  .single();

const mergedAnswers = {
  ...(existing?.answers || {}),
  電話番号: tel,
  tel: tel
};

const { error } = await supabase
  .from('intake')
  .update({
    answers: mergedAnswers
  })
  .eq('patient_id', pid);

if (error) {
  console.error('❌ 更新失敗:', error.message);
} else {
  console.log('✅ 更新成功');
}

const ADMIN_TOKEN = envVars.ADMIN_TOKEN;
const APP_BASE_URL = envVars.APP_BASE_URL || envVars.NEXT_PUBLIC_APP_URL;

if (ADMIN_TOKEN && APP_BASE_URL) {
  await fetch(`${APP_BASE_URL}/api/admin/invalidate-cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ patient_id: pid })
  });
  console.log('✅ キャッシュ無効化完了');
}
