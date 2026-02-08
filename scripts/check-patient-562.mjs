import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const pid = '20260200562';

// intake
const { data: intake } = await supabase.from('intake').select('*').eq('patient_id', pid);
console.log('=== intake ===');
console.log(JSON.stringify(intake, null, 2));

// answerers
const { data: answerers } = await supabase.from('answerers').select('*').eq('patient_id', pid);
console.log('\n=== answerers ===');
console.log(JSON.stringify(answerers, null, 2));

// patient_tags
const { data: tags } = await supabase.from('patient_tags').select('*, tag_definitions(name)').eq('patient_id', pid);
console.log('\n=== patient_tags ===');
console.log(JSON.stringify(tags, null, 2));

// patient_marks
const { data: marks } = await supabase.from('patient_marks').select('*').eq('patient_id', pid);
console.log('\n=== patient_marks ===');
console.log(JSON.stringify(marks, null, 2));

// message_log (last 10)
const { data: msgs } = await supabase.from('message_log').select('*').eq('patient_id', pid).order('sent_at', { ascending: false }).limit(10);
console.log('\n=== message_log (last 10) ===');
for (const m of msgs || []) {
  console.log(`  ${m.sent_at}  [${m.direction}] ${m.message_type}  ${m.content?.slice(0, 80)}`);
}
