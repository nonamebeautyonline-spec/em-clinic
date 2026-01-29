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

// 過去7日間の診察完了者を取得
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, status, reserved_date')
  .eq('status', 'OK')
  .gte('reserved_date', '2026-01-20')  // 過去7日間
  .lte('reserved_date', '2026-01-27')
  .order('reserved_date', { ascending: false })

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`\n過去7日間のstatus=OK患者をチェック中 (${data.length}人)\n`)

const staleCache = []
let checked = 0

for (const patient of data) {
  const pid = patient.patient_id
  checked++

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
        reserved_date: patient.reserved_date,
        nextReservation: result.data.nextReservation
      })

      console.log(`❌ ${patient.patient_name} (${pid}) [${patient.reserved_date}]`)
      console.log(`   nextReservation: ${JSON.stringify(result.data.nextReservation)}`)
      console.log('')
    }
  } catch (e) {
    console.error(`Error checking ${pid}:`, e.message)
  }

  // Progress indicator
  if (checked % 10 === 0) {
    console.log(`Progress: ${checked}/${data.length}`)
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
    console.log(`${p.patient_name} (${p.patient_id}) [${p.reserved_date}]`)
  }

  console.log(`\n患者ID一覧:`)
  console.log(staleCache.map(p => p.patient_id).join(', '))
}
