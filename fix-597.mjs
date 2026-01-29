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

const pid = '20260101597';
const masterInfo = {
  name: '岩波　ひまり',
  answererId: '235605429',
  lineUserId: 'U4142aa9a9581af25687d6f79a699a5c3'
};

console.log(`=== Patient ${pid} を補完 ===`);
console.log(`  name: ${masterInfo.name}`);
console.log(`  answerer_id: ${masterInfo.answererId}`);
console.log(`  line_id: ${masterInfo.lineUserId}`);

const { data: existing } = await supabase
  .from('intake')
  .select('answers')
  .eq('patient_id', pid)
  .single();

const mergedAnswers = {
  ...(existing?.answers || {}),
  氏名: masterInfo.name,
  name: masterInfo.name,
  answerer_id: masterInfo.answererId,
  line_id: masterInfo.lineUserId
};

const { error } = await supabase
  .from('intake')
  .update({
    patient_name: masterInfo.name,
    answerer_id: masterInfo.answererId,
    line_id: masterInfo.lineUserId,
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
