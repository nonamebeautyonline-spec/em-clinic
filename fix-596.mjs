// fix-596.mjs
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

const pid = '20260101596';
const masterInfo = {
  name: '大木 麻美',
  answererId: '235602420',
  lineUserId: 'U26fce1c2ae0c2debb30819640c2d8315'
};

console.log(`=== Patient ${pid} を補完 ===`);
console.log(`  name: ${masterInfo.name}`);
console.log(`  answerer_id: ${masterInfo.answererId}`);
console.log(`  line_id: ${masterInfo.lineUserId}`);

// 既存answersを取得
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

// 更新
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

// キャッシュ無効化
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
