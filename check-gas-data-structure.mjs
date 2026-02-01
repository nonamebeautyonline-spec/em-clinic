// check-gas-data-structure.mjs
// GAS APIから取得するデータの構造を確認

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

async function checkGASData() {
  console.log('=== GAS APIデータ構造確認 ===\n');
  
  try {
    const response = await fetch(gasApiUrl + '?action=getDashboard&full=1');
    if (!response.ok) {
      throw new Error('GAS API error: ' + response.status);
    }
    
    const data = await response.json();
    
    console.log('取得したデータのキー:');
    console.log(Object.keys(data));
    console.log('');
    
    if (data.reservations) {
      console.log('reservations: ' + data.reservations.length + '件');
      
      if (data.reservations.length > 0) {
        console.log('\n最初の予約データ:');
        console.log(JSON.stringify(data.reservations[0], null, 2));
        
        // reserved_dateの分布を確認
        const dateCount = {};
        data.reservations.forEach(r => {
          const date = r.reserved_date;
          dateCount[date] = (dateCount[date] || 0) + 1;
        });
        
        console.log('\n日付別予約件数（上位10件）:');
        Object.entries(dateCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([date, count]) => {
            console.log('  ' + date + ': ' + count + '件');
          });
      }
    } else {
      console.log('reservations: なし');
    }
    
    if (data.intake) {
      console.log('\nintake: ' + data.intake.length + '件');
      
      if (data.intake.length > 0) {
        console.log('\n最初の問診データ:');
        console.log(JSON.stringify(data.intake[0], null, 2));
      }
    } else {
      console.log('\nintake: なし');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkGASData().catch(console.error);
