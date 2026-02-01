// check-gas-reservations-direct.mjs
// GASから2026-01-30の全予約を取得して、重複予約患者を確認

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

const gasApiUrl = envVars.GAS_MYPAGE_URL;

// 調査対象の患者ID（Supabaseで重複が見つかった患者）
const targetPatients = [
  '20260100321', // 5件
  '20260101576', // 5件
  '20251200128', // 4件
  '20260101146', // 2件
  '20260101381', // 2件
  '20260101529', // 2件
  '20260101615', // 2件
  '20260101630', // 2件
];

async function checkGASReservations() {
  console.log('=== GASシート 2026-01-30予約確認 ===\n');
  
  try {
    const response = await fetch(gasApiUrl + '?action=getDashboard&full=1');
    if (!response.ok) {
      throw new Error('GAS API error: ' + response.status);
    }
    
    const data = await response.json();
    const reservations = data.reservations || [];
    
    // 2026-01-30の予約のみフィルタ
    const todayReservations = reservations.filter(r => r.reserved_date === '2026-01-30');
    
    console.log('2026-01-30の総予約件数（GAS）: ' + todayReservations.length + '件\n');
    
    // patient_idでグループ化
    const patientGroups = {};
    todayReservations.forEach(res => {
      if (!patientGroups[res.patient_id]) {
        patientGroups[res.patient_id] = [];
      }
      patientGroups[res.patient_id].push(res);
    });
    
    console.log('患者数: ' + Object.keys(patientGroups).length + '人\n');
    console.log('='.repeat(80));
    
    // Supabaseで重複が見つかった患者のGAS状況を確認
    console.log('\n重複予約患者のGAS状況:\n');
    
    for (const patientId of targetPatients) {
      console.log('患者ID: ' + patientId);
      const gasReservations = patientGroups[patientId] || [];
      
      if (gasReservations.length === 0) {
        console.log('  GAS: 予約なし');
      } else {
        console.log('  GAS: ' + gasReservations.length + '件');
        gasReservations.forEach((r, idx) => {
          console.log('  [' + (idx + 1) + '] 時刻: ' + r.reserved_time + 
                     ', Status: ' + r.status + 
                     ', Reserve ID: ' + (r.reserve_id || 'N/A'));
        });
      }
      console.log('');
    }
    
    // GASシート全体の重複予約も確認
    console.log('\n=== GASシート全体の重複予約 ===\n');
    
    const duplicateInGAS = Object.entries(patientGroups)
      .filter(([patientId, reservs]) => reservs.length >= 2 && patientId !== '20260100211')
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log('GASシートで重複予約がある患者数: ' + duplicateInGAS.length + '人\n');
    
    if (duplicateInGAS.length > 0) {
      duplicateInGAS.forEach(([patientId, reservs]) => {
        console.log('患者ID: ' + patientId + ' (' + reservs.length + '件)');
        reservs.forEach((r, idx) => {
          console.log('  [' + (idx + 1) + '] ' + r.reserved_time + 
                     ' - Status: ' + r.status + 
                     ', Reserve ID: ' + (r.reserve_id || 'N/A'));
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkGASReservations().catch(console.error);
