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

const targetReserveIds = ['resv-1769491337732', 'resv-1769491301952']

for (const rid of targetReserveIds) {
  const { data, error } = await supabase
    .from('intake')
    .select('*')
    .eq('reserve_id', rid)

  if (error) {
    console.error(`Error for ${rid}:`, error)
    continue
  }

  if (data.length === 0) {
    console.log(`\n❌ No record found for reserve_id: ${rid}`)
    continue
  }

  for (const record of data) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`reserve_id: ${record.reserve_id}`)
    console.log(`patient_id: ${record.patient_id}`)
    console.log(`patient_name: "${record.patient_name}"`)
    console.log(`reserved_date: ${record.reserved_date}`)
    console.log(`reserved_time: ${record.reserved_time}`)
    console.log(`answerer_id: "${record.answerer_id}"`)
    console.log(`line_id: "${record.line_id}"`)
    console.log(`status: "${record.status}"`)
    console.log(`created_at: ${record.created_at}`)
    console.log(`\nanswers:`)
    console.log(JSON.stringify(record.answers, null, 2))
  }
}
