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

const gasIntakeListUrl = env.GAS_INTAKE_LIST_URL;

console.log('=== Checking GAS field names for patient 20260100833 ===\n');

try {
  const response = await fetch(`${gasIntakeListUrl}?type=getAllIntake`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error('❌ HTTP error:', response.status);
    process.exit(1);
  }

  const result = await response.json();

  if (!result.ok || !result.data) {
    console.error('❌ Unexpected response format');
    process.exit(1);
  }

  // Find patient 20260100833
  const patient = result.data.find(i => String(i.patient_id).trim() === '20260100833');

  if (!patient) {
    console.log('❌ Patient not found');
    process.exit(1);
  }

  console.log('✅ Found patient 20260100833\n');
  console.log('All field names and values:\n');

  const keys = Object.keys(patient);
  keys.forEach(key => {
    const value = patient[key];
    const display = value === null || value === undefined || value === ''
      ? '(empty)'
      : String(value).length > 100
        ? String(value).substring(0, 100) + '...'
        : String(value);
    console.log(`  ${key}: ${display}`);
  });

  console.log('\n\n=== Looking for kana-related fields ===');
  const kanaKeys = keys.filter(k =>
    k.toLowerCase().includes('kana') ||
    k.includes('カナ') ||
    k.includes('かな') ||
    k.includes('フリガナ') ||
    k.includes('ふりがな')
  );

  if (kanaKeys.length > 0) {
    console.log('Found kana fields:');
    kanaKeys.forEach(k => {
      console.log(`  ${k}: ${patient[k]}`);
    });
  } else {
    console.log('❌ No kana fields found');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
