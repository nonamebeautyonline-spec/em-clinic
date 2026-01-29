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
const ADMIN_TOKEN = env.ADMIN_TOKEN

const supabase = createClient(supabaseUrl, supabaseKey)

const today = '2026-01-27'

// 今日の診察完了者を取得
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, status')
  .eq('reserved_date', today)
  .eq('status', 'OK')

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`\nChecking ${data.length} patients with status=OK today (${today})\n`)

const staleCache = []

for (const patient of data) {
  const pid = patient.patient_id

  // マイページキャッシュをチェック
  try {
    const res = await fetch(`https://app.noname-beauty.jp/api/admin/view-mypage?patient_id=${pid}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    })

    const result = await res.json()

    if (result.ok && result.source === 'cache' && result.data?.nextReservation) {
      // キャッシュがあり、かつ次回予約が表示されている
      staleCache.push({
        patient_id: pid,
        patient_name: patient.patient_name,
        nextReservation: result.data.nextReservation
      })

      console.log(`❌ ${patient.patient_name} (${pid})`)
      console.log(`   nextReservation: ${JSON.stringify(result.data.nextReservation)}`)
      console.log('')
    } else if (result.ok && result.source === 'cache') {
      console.log(`✓ ${patient.patient_name} (${pid}) - cache OK (no nextReservation)`)
    } else if (result.ok && result.source === 'gas') {
      console.log(`✓ ${patient.patient_name} (${pid}) - fresh from GAS`)
    }
  } catch (e) {
    console.error(`Error checking ${pid}:`, e.message)
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log(`\n=== Summary ===`)
console.log(`Total checked: ${data.length}`)
console.log(`Stale cache found: ${staleCache.length}`)

if (staleCache.length > 0) {
  console.log(`\n=== Patients with stale cache ===`)
  for (const p of staleCache) {
    console.log(`${p.patient_name} (${p.patient_id})`)
  }
}
