// check-duplicate-reservations-0130.mjs
// 2026-01-30の重複予約を調査

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateReservations() {
  console.log('=== 2026-01-30 重複予約調査 ===\n');

  // 2026-01-30の全予約を取得（canceledも含む）
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .gte('reserved_date', '2026-01-30')
    .lt('reserved_date', '2026-01-31')
    .order('patient_id', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching reservations:', error);
    return;
  }

  console.log('総予約件数: ' + reservations.length + '\n');

  // patient_idでグループ化
  const patientGroups = {};
  reservations.forEach(res => {
    if (!patientGroups[res.patient_id]) {
      patientGroups[res.patient_id] = [];
    }
    patientGroups[res.patient_id].push(res);
  });

  // 2件以上の予約がある患者を特定
  const duplicatePatients = Object.entries(patientGroups)
    .filter(([patientId, reservs]) => reservs.length >= 2 && patientId !== '20260100211')
    .sort((a, b) => b[1].length - a[1].length); // 予約件数の多い順

  console.log('重複予約がある患者数: ' + duplicatePatients.length + '人\n');
  console.log('='.repeat(80));

  for (const [patientId, reservs] of duplicatePatients) {
    console.log('\n患者ID: ' + patientId);
    console.log('予約件数: ' + reservs.length + '件');

    // statusの内訳
    const statusCounts = {};
    reservs.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    console.log('Status内訳:', JSON.stringify(statusCounts));

    // 時系列で表示（created_at順）
    console.log('\n予約の時系列:');
    reservs.forEach((r, index) => {
      const createdAt = new Date(r.created_at);
      const reservedTime = r.reserved_time || 'N/A';
      const num = index + 1;
      console.log('  [' + num + '] ' + createdAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      console.log('      ID: ' + r.id + ', Status: ' + r.status + ', 予約時刻: ' + reservedTime);
      console.log('      Reserve ID: ' + (r.reserve_id || 'N/A'));
    });

    // 時間差分析
    if (reservs.length >= 2) {
      const firstCreated = new Date(reservs[0].created_at);
      const lastCreated = new Date(reservs[reservs.length - 1].created_at);
      const timeDiffMs = lastCreated - firstCreated;
      const timeDiffMin = Math.floor(timeDiffMs / 1000 / 60);
      const timeDiffSec = Math.floor((timeDiffMs / 1000) % 60);
      
      console.log('\n最初の予約: ' + firstCreated.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      console.log('最後の予約: ' + lastCreated.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      console.log('時間差: ' + timeDiffMin + '分' + timeDiffSec + '秒');
    }

    // パターン分析
    console.log('\nパターン分析:');
    const allCanceled = reservs.every(r => r.status === 'canceled');
    const lastOnePending = reservs.length >= 2 && 
                          reservs[reservs.length - 1].status === 'pending' &&
                          reservs.slice(0, -1).every(r => r.status === 'canceled');
    const allPending = reservs.every(r => r.status === 'pending');
    
    if (allCanceled) {
      console.log('  警告: 全てcanceled - 予約が確定していない可能性');
    } else if (lastOnePending) {
      console.log('  警告: 最後の1件だけpending - DBに反映されず何度も取り直したパターン');
    } else if (allPending) {
      console.log('  警告: 全てpending - 重複予約の可能性');
    } else {
      console.log('  混合パターン - 詳細確認が必要');
    }

    // 短時間での連続予約チェック（5分以内）
    const rapidBookings = [];
    for (let i = 1; i < reservs.length; i++) {
      const prevTime = new Date(reservs[i - 1].created_at);
      const currTime = new Date(reservs[i].created_at);
      const diffMs = currTime - prevTime;
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 300) { // 5分以内
        rapidBookings.push({
          index: i,
          diffSec,
          prevStatus: reservs[i - 1].status,
          currStatus: reservs[i].status
        });
      }
    }

    if (rapidBookings.length > 0) {
      console.log('\n警告: 短時間での連続予約:');
      rapidBookings.forEach(rb => {
        const prev = rb.index;
        const next = rb.index + 1;
        console.log('  予約' + prev + 'から' + next + ': ' + rb.diffSec + '秒後 (' + rb.prevStatus + ' -> ' + rb.currStatus + ')');
      });
    }

    console.log('\n' + '-'.repeat(80));
  }

  // サマリー
  console.log('\n\n=== サマリー ===');
  console.log('重複予約患者数: ' + duplicatePatients.length + '人');
  
  const patterns = {
    allCanceled: 0,
    lastOnePending: 0,
    allPending: 0,
    mixed: 0
  };

  duplicatePatients.forEach(([patientId, reservs]) => {
    const allCanceled = reservs.every(r => r.status === 'canceled');
    const lastOnePending = reservs.length >= 2 && 
                          reservs[reservs.length - 1].status === 'pending' &&
                          reservs.slice(0, -1).every(r => r.status === 'canceled');
    const allPending = reservs.every(r => r.status === 'pending');
    
    if (allCanceled) patterns.allCanceled++;
    else if (lastOnePending) patterns.lastOnePending++;
    else if (allPending) patterns.allPending++;
    else patterns.mixed++;
  });

  console.log('\nパターン別内訳:');
  console.log('  全てcanceled: ' + patterns.allCanceled + '人');
  console.log('  最後の1件だけpending: ' + patterns.lastOnePending + '人');
  console.log('  全てpending: ' + patterns.allPending + '人');
  console.log('  混合パターン: ' + patterns.mixed + '人');
}

checkDuplicateReservations().catch(console.error);
