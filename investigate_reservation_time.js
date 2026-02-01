const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables not loaded properly');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateReservationTime() {
  console.log('=== 予約時刻ずれ調査 ===\n');
  console.log('Patient ID: 20260100211');
  console.log('Reserved Date: 2026-01-30\n');

  try {
    // 1. reservationsテーブルから該当レコードを取得
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('patient_id', '20260100211')
      .eq('reserved_date', '2026-01-30')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservation:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('該当する予約が見つかりませんでした。');
      return;
    }

    console.log('取得件数: ' + data.length + '件\n');

    // 2. 各レコードの詳細を表示
    data.forEach((reservation, index) => {
      console.log('--- レコード ' + (index + 1) + ' ---');
      console.log('ID:', reservation.id);
      console.log('Patient ID:', reservation.patient_id);
      console.log('Reserved Date:', reservation.reserved_date);
      console.log('Reserved Time:', reservation.reserved_time);
      console.log('Reserved Time End:', reservation.reserved_time_end);
      console.log('Status:', reservation.status);
      console.log('Created At:', reservation.created_at);
      console.log('Updated At:', reservation.updated_at);
      console.log('Medical Institution ID:', reservation.medical_institution_id);
      console.log('Reservation Type:', reservation.reservation_type);
      console.log('');

      // 3. 時刻のずれを分析
      if (reservation.reserved_time) {
        console.log('時刻分析:');
        console.log('  DB上の予約開始時刻:', reservation.reserved_time);
        console.log('  DB上の予約終了時刻:', reservation.reserved_time_end);
        
        // 期待される時刻（GASシート）
        const expectedStart = '15:15:00';
        const expectedEnd = '15:30:00';
        console.log('  期待される開始時刻:', expectedStart);
        console.log('  期待される終了時刻:', expectedEnd);
        
        // 時刻の差分を計算
        const dbStartMinutes = timeToMinutes(reservation.reserved_time);
        const expectedStartMinutes = timeToMinutes(expectedStart);
        const diffMinutes = dbStartMinutes - expectedStartMinutes;
        
        console.log('  時刻のずれ:', diffMinutes, '分');
        console.log('');
      }
    });

    // 4. 全レコードをJSON形式で出力
    console.log('=== 全レコード (JSON) ===');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('予期しないエラー:', err);
  }
}

// 時刻文字列を分に変換する関数
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

investigateReservationTime();
