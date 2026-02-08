import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 移行日以降に作成されたanswerers（個人情報フォーム経由の新規登録）
// まず移行のタイミングを推定（大量にcreated_atが同じ時刻のものは移行データ）
const { data: answerers } = await supabase
  .from('answerers')
  .select('patient_id, name, created_at')
  .order('created_at', { ascending: false })
  .limit(30);

console.log('=== 最新のanswerers 30件 ===');
for (const a of answerers || []) {
  console.log(`  ${a.created_at}  ${a.patient_id}  ${a.name}`);
}

// SMS認証済み（phone_verified）の確認
const { data: verified } = await supabase
  .from('answerers')
  .select('patient_id, name, phone, phone_verified, created_at, updated_at')
  .eq('phone_verified', true)
  .order('updated_at', { ascending: false })
  .limit(20);

console.log('\n=== SMS認証済み（phone_verified=true）最新20件 ===');
for (const v of verified || []) {
  console.log(`  ${v.updated_at}  ${v.patient_id}  ${v.name}  ${v.phone}`);
}

// LINE_で始まらないPIDで最近作成されたintake（registerフローで作成された患者）
const { data: recentIntake } = await supabase
  .from('intake')
  .select('patient_id, patient_name, line_id, created_at')
  .not('patient_id', 'like', 'LINE_%')
  .order('created_at', { ascending: false })
  .limit(20);

console.log('\n=== 最新intake（正式PID）20件 ===');
for (const i of recentIntake || []) {
  console.log(`  ${i.created_at}  ${i.patient_id}  ${i.patient_name}  line:${i.line_id ? 'あり' : 'なし'}`);
}

// 直近で /api/register/personal-info に投稿した形跡を見る
// → answerers のうち created_at が移行日(2026-02-07くらい)以降で個別に作成されたもの
const { data: postMigration } = await supabase
  .from('answerers')
  .select('patient_id, name, name_kana, sex, birthday, phone, phone_verified, created_at, updated_at')
  .gte('created_at', '2026-02-07T00:00:00')
  .order('created_at', { ascending: true });

console.log(`\n=== 2026-02-07以降に作成されたanswerers: ${postMigration?.length || 0}件 ===`);
for (const p of postMigration || []) {
  console.log(`  ${p.created_at}  ${p.patient_id}  ${p.name} ${p.name_kana || ''}  sex:${p.sex || '-'}  birthday:${p.birthday || '-'}  phone:${p.phone || '-'}  verified:${p.phone_verified}`);
}
