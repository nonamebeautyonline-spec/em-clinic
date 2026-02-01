// analyze-gas-duplicates-0130.mjs
// GASシートの2026-01-30重複予約を分析

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

// Supabaseで重複が見つかった患者ID
const supabaseDuplicates = [
  '20260100321', // 5件
  '20260101576', // 5件
  '20251200128', // 4件
  '20260101146', // 2件
  '20260101381', // 2件
  '20260101529', // 2件
  '20260101615', // 2件
  '20260101630', // 2件
];

async function analyzeGASDuplicates() {
  console.log('=== GASシート 2026-01-30 重複予約分析 ===\n');
  
  try {
    const response = await fetch(gasApiUrl + '?action=getDashboard&full=1');
    if (!response.ok) {
      throw new Error('GAS API error: ' + response.status);
    }
    
    const allData = await response.json();
    
    // 2026-01-30の予約のみフィルタ
    const jan30Data = allData.filter(item => item.reserved_date === '2026-01-30');
    
    console.log('2026-01-30の総予約件数（GAS）: ' + jan30Data.length + '件\n');
    
    // patient_idでグループ化
    const patientGroups = {};
    jan30Data.forEach(res => {
      const pid = String(res.patient_id);
      if (!patientGroups[pid]) {
        patientGroups[pid] = [];
      }
      patientGroups[pid].push(res);
    });
    
    // GASシートでの重複予約を確認
    const gasDuplicates = Object.entries(patientGroups)
      .filter(([pid, reservs]) => reservs.length >= 2 && pid !== '20260100211')
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log('GASシートで重複予約がある患者数: ' + gasDuplicates.length + '人\n');
    console.log('='.repeat(80));
    
    if (gasDuplicates.length > 0) {
      console.log('\nGASシートの重複予約:\n');
      gasDuplicates.forEach(([pid, reservs]) => {
        console.log('患者ID: ' + pid + ' (' + reservs.length + '件)');
        reservs.forEach((r, idx) => {
          console.log('  [' + (idx + 1) + '] ' + r.reserved_time + 
                     ', Status: ' + (r.status || 'N/A') +
                     ', Reserve ID: ' + (r.reserveId || r.reserve_id || 'N/A'));
        });
        console.log('');
      });
    }
    
    // Supabaseで見つかった重複予約患者のGAS状況
    console.log('\n' + '='.repeat(80));
    console.log('\nSupabaseで重複予約が見つかった患者のGAS状況:\n');
    
    for (const pid of supabaseDuplicates) {
      console.log('患者ID: ' + pid);
      const gasReservs = patientGroups[pid] || [];
      
      if (gasReservs.length === 0) {
        console.log('  GAS: 予約なし');
      } else {
        console.log('  GAS: ' + gasReservs.length + '件');
        gasReservs.forEach((r, idx) => {
          console.log('  [' + (idx + 1) + '] ' + r.reserved_time + 
                     ', Status: ' + (r.status || 'N/A') +
                     ', Name: ' + (r.name || 'N/A') +
                     ', Reserve ID: ' + (r.reserveId || r.reserve_id || 'N/A'));
        });
      }
      console.log('');
    }
    
    // サマリー
    console.log('\n=== サマリー ===');
    console.log('GAS全体: 重複予約 ' + gasDuplicates.length + '人');
    console.log('Supabase重複患者のGAS状況:');
    
    let gasHas = 0;
    let gasNotHas = 0;
    for (const pid of supabaseDuplicates) {
      if (patientGroups[pid] && patientGroups[pid].length > 0) {
        gasHas++;
      } else {
        gasNotHas++;
      }
    }
    
    console.log('  GASに存在: ' + gasHas + '人');
    console.log('  GASに存在しない: ' + gasNotHas + '人');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

analyzeGASDuplicates().catch(console.error);
