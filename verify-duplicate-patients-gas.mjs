// verify-duplicate-patients-gas.mjs
// 重複予約患者のGASシートでの実際の状況を確認

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

// 調査対象の患者ID
const targetPatients = [
  '20260100321', // 5件（最後の1件だけpending）
  '20260101576', // 5件（最後の1件だけpending）
  '20251200128', // 4件（全てcanceled）
  '20260101146', // 2件（全てcanceled）
  '20260101381', // 2件（最後の1件だけpending）
  '20260101529', // 2件（最後の1件だけpending）
  '20260101615', // 2件（最後の1件だけpending）
  '20260101630', // 2件（最後の1件だけpending）
];

async function checkPatientInGAS(patientId) {
  try {
    const response = await fetch(gasApiUrl + '?action=getDashboard&full=1');
    if (!response.ok) {
      throw new Error('GAS API error: ' + response.status);
    }
    
    const data = await response.json();
    
    // 予約シートから該当患者を検索
    const reservations = data.reservations || [];
    const patientReservations = reservations.filter(r => 
      r.patient_id === patientId && 
      r.reserved_date === '2026-01-30'
    );
    
    // 問診シートから該当患者を検索
    const intakes = data.intake || [];
    const patientIntake = intakes.find(i => i.patient_id === patientId);
    
    return {
      patientId,
      reservations: patientReservations,
      intake: patientIntake || null
    };
  } catch (error) {
    console.error('Error checking patient ' + patientId + ':', error.message);
    return {
      patientId,
      error: error.message
    };
  }
}

async function verifyAllPatients() {
  console.log('=== GASシートでの予約状況確認 ===\n');
  console.log('対象患者数: ' + targetPatients.length + '人\n');
  
  for (const patientId of targetPatients) {
    console.log('患者ID: ' + patientId);
    
    const result = await checkPatientInGAS(patientId);
    
    if (result.error) {
      console.log('  エラー: ' + result.error);
    } else {
      console.log('  予約件数: ' + result.reservations.length + '件');
      
      if (result.reservations.length > 0) {
        result.reservations.forEach((r, idx) => {
          console.log('  [' + (idx + 1) + '] 時刻: ' + r.reserved_time + 
                     ', Status: ' + r.status + 
                     ', Reserve ID: ' + (r.reserve_id || 'N/A'));
        });
      } else {
        console.log('  警告: GASシートに予約が見つかりません');
      }
      
      if (result.intake) {
        console.log('  問診: あり（名前: ' + (result.intake.name || 'N/A') + '）');
      } else {
        console.log('  問診: なし');
      }
    }
    
    console.log('');
    
    // API制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== 確認完了 ===');
}

verifyAllPatients().catch(console.error);
