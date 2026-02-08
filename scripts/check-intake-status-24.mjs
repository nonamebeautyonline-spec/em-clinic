import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fzfkgemtaxsrocbucmza.supabase.co';
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ids = [
  '20260200560','20260200458','20260200453','20260200504','20260200565',
  '20260200568','20260200581','20260200582','20260200583','20260200587',
  '20260200586','20260200562','20260200571','20260200314','20260200579',
  '20260200585','20260200577','20260200588','20260100110','20260200570',
  '20260200572','20260200576','20260200580','20260200346'
];

const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, status, answers, reserved_date, reserved_time, updated_at')
  .in('patient_id', ids)
  .order('created_at', { ascending: false });

if (error) { console.error(error); process.exit(1); }

const latest = {};
for (const row of data) {
  if (!latest[row.patient_id]) latest[row.patient_id] = row;
}

let done = 0;
let notDone = 0;

console.log('patient_id   | 氏名         | 予約日     | 問診 | status');
console.log('-'.repeat(75));

for (const id of ids) {
  const row = latest[id];
  if (!row) {
    console.log(`${id} | (レコードなし)`);
    notDone++;
    continue;
  }
  const answers = row.answers;
  const hasNgCheck = answers && typeof answers.ng_check === 'string' && answers.ng_check !== '';
  const mark = hasNgCheck ? 'OK' : '--';
  if (hasNgCheck) done++; else notDone++;
  const name = (row.patient_name || '').padEnd(10);
  const date = row.reserved_date || '-';
  const st = row.status || '-';
  console.log(`${id} | ${name} | ${date} | ${mark}   | ${st}`);
}

console.log('');
console.log(`問診完了: ${done}人 / 未完了: ${notDone}人`);
