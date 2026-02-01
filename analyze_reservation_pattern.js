const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePattern() {
  console.log('=== 予約時刻ずれパターン分析 ===\n');

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('patient_id', '20260100211')
      .eq('reserved_date', '2026-01-30')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('分析結果:\n');

    const timeShifts = {};
    data.forEach(reservation => {
      const dbMinutes = timeToMinutes(reservation.reserved_time);
      const expectedMinutes = 15 * 60 + 15;
      const diff = dbMinutes - expectedMinutes;
      
      if (!timeShifts[diff]) {
        timeShifts[diff] = [];
      }
      timeShifts[diff].push({
        id: reservation.id,
        time: reservation.reserved_time,
        created: reservation.created_at
      });
    });

    console.log('時刻のずれパターン:');
    Object.keys(timeShifts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(shiftMinutes => {
      const count = timeShifts[shiftMinutes].length;
      const sign = shiftMinutes > 0 ? '+' : '';
      console.log('  ' + sign + shiftMinutes + '分: ' + count + '件');
      timeShifts[shiftMinutes].forEach(item => {
        console.log('    - ID ' + item.id + ': ' + item.time + ' (作成: ' + item.created + ')');
      });
    });

    console.log('\n=== 最新の予約（ID=2398）の詳細 ===');
    const latest = data[0];
    console.log('ID:', latest.id);
    console.log('Reserve ID:', latest.reserve_id);
    console.log('Created At:', latest.created_at);
    console.log('Reserved Time:', latest.reserved_time);
    console.log('Status:', latest.status);
    console.log('Expected Time: 15:15:00');
    console.log('Actual Time:', latest.reserved_time);
    console.log('Difference: +90 minutes');
    
    console.log('\n=== 正しい時刻の予約（ID=2381）の詳細 ===');
    const correct = data[data.length - 1];
    console.log('ID:', correct.id);
    console.log('Reserve ID:', correct.reserve_id);
    console.log('Created At:', correct.created_at);
    console.log('Reserved Time:', correct.reserved_time);
    console.log('Status:', correct.status);

    console.log('\n=== 仮説 ===');
    console.log('1. 最初の予約（ID=2381）は正しい時刻（15:15）で作成された');
    console.log('2. その後の予約は様々な時刻でテストされた（15:30, 15:45, 14:30, 14:45など）');
    console.log('3. 最新の予約（ID=2398）は16:45で、15:15から+90分ずれている');
    console.log('4. この+90分のずれは、タイムゾーン変換の問題の可能性が高い');
    console.log('   - JST (UTC+9) とデータベースのタイムゾーンの差異');
    console.log('   - または、日時処理コードでの90分の定数エラー');

  } catch (err) {
    console.error('Error:', err);
  }
}

function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

analyzePattern();
