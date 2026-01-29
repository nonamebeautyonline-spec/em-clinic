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

// Today's reservations in Supabase
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, reserve_id, reserved_date, reserved_time, status, answers')
  .eq('reserved_date', today)
  .order('reserved_time', { ascending: true })

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`\nToday (${today}) reservations in Supabase: ${data.length}`)
console.log('─'.repeat(80))

for (const row of data) {
  const hasAnswers = row.answers && Object.keys(row.answers).length > 0 && row.answers.ng_check
  console.log(`${row.reserved_time || '(no time)'} - ${row.patient_name || '(no name)'} (${row.patient_id})`)
  console.log(`  reserve_id: ${row.reserve_id || '(null)'}`)
  console.log(`  status: ${row.status || '(empty)'}`)
  console.log(`  answers: ${hasAnswers ? 'YES' : 'NO (empty)'}`)
  console.log()
}
