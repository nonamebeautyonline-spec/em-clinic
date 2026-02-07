import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. mark_definitions: 「なし」→「未対応」にリネーム
console.log('=== Renaming "なし" to "未対応" ===');
const { data: updated, error: updateErr } = await supabase
  .from('mark_definitions')
  .update({ label: '未対応' })
  .eq('value', 'none')
  .select();

if (updateErr) console.log('Error:', updateErr.message);
else console.log('Updated:', updated);

// 2. patient_marks 全削除（全員を未対応にリセット）
console.log('\n=== Deleting all patient_marks (reset to 未対応) ===');
const { count, error: delErr } = await supabase
  .from('patient_marks')
  .delete()
  .neq('patient_id', '')  // 全レコード削除
  .select('*', { count: 'exact', head: true });

// count might not work with delete, let's check
if (delErr) console.log('Error:', delErr.message);
else console.log('Deleted records');

// 確認
const { count: remaining } = await supabase
  .from('patient_marks')
  .select('*', { count: 'exact', head: true });
console.log('Remaining patient_marks records:', remaining);

// mark_definitions確認
const { data: marks } = await supabase
  .from('mark_definitions')
  .select('*')
  .order('sort_order', { ascending: true });
console.log('\n=== Current mark_definitions ===');
for (const m of marks || []) {
  console.log(`  ${m.sort_order}. [${m.value}] ${m.label} (${m.color})`);
}

console.log('\n=== Done ===');
