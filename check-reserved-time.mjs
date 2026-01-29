import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)="?([^"]+)"?$/)
  if (match) {
    env[match[1]] = match[2]
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const today = '2026-01-27'

const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, reserved_date, reserved_time')
  .eq('reserved_date', today)
  .order('reserved_time', { ascending: true })
  .limit(10)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`\nFirst 10 records for ${today}:\n`)

for (const row of data) {
  console.log(`${row.reserved_time || '(empty)'} - ${row.patient_name || '(no name)'} (${row.patient_id})`)
}

console.log(`\nTotal records: ${data.length}`)

// Count empty reserved_time
const { data: allData } = await supabase
  .from('intake')
  .select('patient_id, reserved_time')
  .eq('reserved_date', today)

const emptyTime = allData.filter(row => !row.reserved_time || row.reserved_time.trim() === '')
console.log(`\nRecords with empty reserved_time: ${emptyTime.length} / ${allData.length}`)

if (emptyTime.length > 0) {
  console.log('\nPatient IDs with empty reserved_time:')
  for (const row of emptyTime.slice(0, 10)) {
    console.log(`  ${row.patient_id}`)
  }
}
