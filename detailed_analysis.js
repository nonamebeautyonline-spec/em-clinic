const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('=== 詳細分析: patient_id 20260100211 ===\n');
    
    const { data, error } = await supabase
      .from('reservations')
      .select('id, reserve_id, reserved_date, reserved_time, status, created_at, updated_at')
      .eq('patient_id', '20260100211')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    console.log('時系列順（作成日時の古い順）:\n');
    
    data.forEach((record, index) => {
      const createdDate = new Date(record.created_at);
      const updatedDate = record.updated_at ? new Date(record.updated_at) : null;
      const num = index + 1;
      
      console.log('【予約 ' + num + '】');
      console.log('  Reserve ID: ' + record.reserve_id);
      console.log('  予約日時: ' + record.reserved_date + ' ' + record.reserved_time);
      console.log('  Status: ' + record.status);
      console.log('  作成: ' + createdDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      if (updatedDate) {
        console.log('  更新: ' + updatedDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
        const timeDiff = Math.floor((updatedDate - createdDate) / 1000 / 60);
        console.log('  (作成から' + timeDiff + '分後にキャンセル)');
      }
      console.log('  DB ID: ' + record.id);
      console.log('');
    });
    
    console.log('=== 重要な発見 ===');
    const oldest = data[0];
    const newest = data[data.length - 1];
    
    console.log('最初の予約: ' + oldest.reserved_date + ' ' + oldest.reserved_time);
    console.log('  - これがGASシートで見えている「15:15」の予約の可能性が高い');
    console.log('  - Reserve ID: ' + oldest.reserve_id);
    console.log('  - DB Status: ' + oldest.status);
    console.log('  - 更新日時: ' + (oldest.updated_at || 'なし'));
    console.log('');
    console.log('最新の予約: ' + newest.reserved_date + ' ' + newest.reserved_time);
    console.log('  - Reserve ID: ' + newest.reserve_id);
    console.log('  - DB Status: ' + newest.status);
    console.log('');
    
    const time1515 = data.filter(r => r.reserved_time === '15:15:00');
    const time1645 = data.filter(r => r.reserved_time === '16:45:00');
    
    console.log('15:15の予約: ' + (time1515.length > 0 ? time1515.length + '件' : 'なし'));
    if (time1515.length > 0) {
      time1515.forEach(r => {
        console.log('  - Reserve ID: ' + r.reserve_id + ', Status: ' + r.status);
      });
    }
    
    console.log('16:45の予約: ' + (time1645.length > 0 ? time1645.length + '件' : 'なし'));
    if (time1645.length > 0) {
      time1645.forEach(r => {
        console.log('  - Reserve ID: ' + r.reserve_id + ', Status: ' + r.status);
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
