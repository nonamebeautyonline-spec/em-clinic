// check-gas-array-data.mjs
// GAS APIが返す配列データを確認

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

async function checkGASArrayData() {
  console.log('=== GAS API配列データ確認 ===\n');
  
  try {
    const response = await fetch(gasApiUrl + '?action=getDashboard&full=1');
    if (!response.ok) {
      throw new Error('GAS API error: ' + response.status);
    }
    
    const data = await response.json();
    
    console.log('データ型: ' + (Array.isArray(data) ? '配列' : 'オブジェクト'));
    console.log('データ数: ' + (Array.isArray(data) ? data.length : Object.keys(data).length));
    console.log('');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('最初の要素:');
      console.log(JSON.stringify(data[0], null, 2));
      console.log('');
      
      console.log('最初の5要素のpatient_idとreserved_date:');
      data.slice(0, 5).forEach((item, idx) => {
        console.log('[' + idx + '] patient_id: ' + (item.patient_id || 'N/A') + 
                   ', reserved_date: ' + (item.reserved_date || 'N/A') +
                   ', reserved_time: ' + (item.reserved_time || 'N/A'));
      });
      console.log('');
      
      // 2026-01-30の予約を検索
      const jan30Reservations = data.filter(item => item.reserved_date === '2026-01-30');
      console.log('2026-01-30の予約: ' + jan30Reservations.length + '件');
      
      if (jan30Reservations.length > 0) {
        console.log('\n2026-01-30の予約（最初の10件）:');
        jan30Reservations.slice(0, 10).forEach((item, idx) => {
          console.log('[' + (idx + 1) + '] ' + item.patient_id + 
                     ', ' + item.reserved_time + 
                     ', Status: ' + (item.status || 'N/A'));
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

checkGASArrayData().catch(console.error);
