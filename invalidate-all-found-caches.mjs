// 発見した全ステイルキャッシュ患者のキャッシュを無効化
const ADMIN_TOKEN = 'secret'

const patients = [
  { id: '20260101436', name: '水野 瑠華' },
  { id: '20260101214', name: '安岡 遥夏' },
  { id: '20260101425', name: '荒木理子' },
  { id: '20260101326', name: '田中' },
  { id: '20260100939', name: '患者(ユーザー報告)' }
]

console.log(`\n${patients.length}人の患者のキャッシュを無効化します...\n`)

for (const patient of patients) {
  console.log(`Invalidating cache for ${patient.name} (${patient.id})...`)

  try {
    const res = await fetch('https://app.noname-beauty.jp/api/admin/invalidate-cache', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ patient_id: patient.id })
    })

    const data = await res.json()

    if (data.ok) {
      console.log(`  ✓ Cache invalidated`)
    } else {
      console.log(`  ✗ Failed: ${data.error}`)
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`)
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 200))
}

console.log('\n=== Complete ===')
console.log('全患者のキャッシュを無効化しました。')
console.log('次にVercelへのデプロイを行ってください。')
