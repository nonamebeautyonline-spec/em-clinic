import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match && match[1] && match[2]) {
    const key = match[1].trim();
    let value = match[2].trim();
    value = value.replace(/^"/, '').replace(/"$/, '');
    env[key] = value;
  }
});

// Try different GAS URLs
const gasUrls = {
  intake_list: env.GAS_INTAKE_LIST_URL,
  mypage: env.GAS_MYPAGE_URL,
  admin: env.GAS_ADMIN_URL,
};

const patientIds = [
  '20260100833',
  '20260100743',
  '20260100630',
  '20260100756',
  '20260100798',
  '20260100844'
];

console.log('=== Fetching patient data from GAS ===\n');

// Try each patient individually with mypage URL
for (const patientId of patientIds) {
  console.log(`\n--- Patient ID: ${patientId} ---`);

  try {
    const response = await fetch(gasUrls.mypage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'intake',
        patient_id: patientId
      })
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);

      if (data.intake) {
        const intake = data.intake;
        console.log('✅ Found in GAS:');
        console.log('  patient_name:', intake.patient_name || 'MISSING');
        console.log('  patient_kana:', intake.patient_kana || 'MISSING');
        console.log('  phone:', intake.phone || 'MISSING');
        console.log('  email:', intake.email || 'MISSING');
        console.log('  answerer_id:', intake.answerer_id || 'MISSING');

        // Output SQL for backfill
        if (intake.patient_kana || intake.phone) {
          console.log('\nSQL to backfill:');
          console.log(`UPDATE intake SET`);
          if (intake.patient_kana) console.log(`  patient_kana = '${intake.patient_kana}',`);
          if (intake.phone) console.log(`  phone = '${intake.phone}',`);
          if (intake.email) console.log(`  email = '${intake.email}',`);
          console.log(`WHERE patient_id = '${patientId}';`);
        }
      } else {
        console.log('⚠️ No intake data in response');
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200));
      }
    } catch (e) {
      console.log('⚠️ Response is not JSON');
      console.log('Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }
}
