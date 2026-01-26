// Quick script to check patient data in Supabase
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const patientId = process.argv[2] || '20251200128';
const apiUrl = `${url}/rest/v1/intake?patient_id=eq.${patientId}&select=patient_id,reserve_id,reserved_date,reserved_time,patient_name,status`;

fetch(apiUrl, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log(`Patient ${patientId} in Supabase:`);
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('Error:', err));
