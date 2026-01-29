import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase
  .from('intake')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`Total records fetched: ${data.length}\n`)

for (const row of data) {
  console.log('─'.repeat(80))
  console.log(`reserve_id: ${row.reserve_id}`)
  console.log(`patient_id: ${row.patient_id}`)
  console.log(`patient_name: ${row.patient_name || '(empty)'}`)
  console.log(`reserved_date: ${row.reserved_date || '(empty)'}`)
  console.log(`reserved_time: ${row.reserved_time || '(empty)'}`)
  console.log(`status: ${row.status || '(empty)'}`)
  console.log(`answers: ${row.answers ? JSON.stringify(row.answers).substring(0, 100) + '...' : '(empty)'}`)
  console.log(`created_at: ${row.created_at}`)
}

console.log('─'.repeat(80))

const emptyNames = data.filter(row => !row.patient_name || row.patient_name.trim() === '')
console.log(`\nRecords with empty patient_name: ${emptyNames.length}`)

const emptyAnswers = data.filter(row => !row.answers || Object.keys(row.answers).length === 0)
console.log(`Records with empty answers: ${emptyAnswers.length}`)

const emptyReservedDate = data.filter(row => !row.reserved_date)
console.log(`Records with empty reserved_date: ${emptyReservedDate.length}`)
