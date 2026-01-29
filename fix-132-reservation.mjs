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

const pid = '20260100132';
console.log(`=== Patient ${pid} の予約を確認・作成 ===\n`);

// GASから取得
const gasRes = await fetch(envVars.GAS_INTAKE_LIST_URL);
const gasData = await gasRes.json();
const gasRows = gasData.ok ? gasData.rows : gasData;
const row = gasRows.find(r => String(r.patient_id || '').trim() === pid);

if (!row) {
  console.error('❌ GASに見つかりません');
  process.exit(1);
}

console.log('GASの予約情報:');
console.log('  reserve_id:', row.reserveId || row.reserved || '(なし)');
console.log('  reserved_date:', row.reserved_date || '(なし)');
console.log('  reserved_time:', row.reserved_time || '(なし)');
console.log('  status:', row.status || '(なし)');

const reserveId = row.reserveId || row.reserved;
if (!reserveId) {
  console.log('\n❌ GASにも予約情報がありません');
  process.exit(0);
}

// Supabaseのreservationsテーブルを確認
const { data: existing } = await supabase
  .from('reservations')
  .select('*')
  .eq('reserve_id', reserveId)
  .single();

if (existing) {
  console.log('\n✅ Supabase reservationsに既に存在します');
  console.log('  reserve_id:', existing.reserve_id);
  console.log('  patient_id:', existing.patient_id);
} else {
  console.log('\nSupabase reservationsに挿入中...');
  
  const { error } = await supabase
    .from('reservations')
    .insert({
      reserve_id: reserveId,
      patient_id: pid,
      patient_name: row.name || null,
      reserved_date: row.reserved_date || null,
      reserved_time: row.reserved_time || null,
      status: row.status || null,
      note: row.doctor_note || null,
      prescription_menu: row.prescription_menu || null
    });

  if (error) {
    console.error('❌ 挿入失敗:', error.message);
  } else {
    console.log('✅ 挿入成功');
  }
}

// intakeテーブルのreserve_idも更新
console.log('\nintakeテーブルを更新中...');
const { error: updateError } = await supabase
  .from('intake')
  .update({
    reserve_id: reserveId,
    reserved_date: row.reserved_date || null,
    reserved_time: row.reserved_time || null
  })
  .eq('patient_id', pid);

if (updateError) {
  console.error('❌ 更新失敗:', updateError.message);
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
