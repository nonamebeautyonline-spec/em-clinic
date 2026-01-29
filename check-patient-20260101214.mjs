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

// 患者20260101214のデータを確認
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, status, reserved_date, reserved_time')
  .eq('patient_id', '20260101214')
  .single()

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log('患者20260101214のデータ:')
console.log(JSON.stringify(data, null, 2))
