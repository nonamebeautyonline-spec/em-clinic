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

const targetPids = ['20260101480', '20260101481', '20260101482']

for (const pid of targetPids) {
  const { data, error } = await supabase
    .from('intake')
    .select('*')
    .eq('patient_id', pid)
    .single()

  if (error) {
    console.error(`Error for ${pid}:`, error)
    continue
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`patient_id: ${data.patient_id}`)
  console.log(`patient_name: "${data.patient_name}"`)
  console.log(`reserve_id: ${data.reserve_id}`)
  console.log(`reserved_date: ${data.reserved_date}`)
  console.log(`reserved_time: ${data.reserved_time}`)
  console.log(`answerer_id: "${data.answerer_id}"`)
  console.log(`line_id: "${data.line_id}"`)
  console.log(`status: "${data.status}"`)
  console.log(`\nanswers object:`)
  console.log(JSON.stringify(data.answers, null, 2))
}
