// ステイルキャッシュを持つ患者のキャッシュを無効化
const ADMIN_TOKEN = 'secret'

const patients = [
  { id: '20260101436', name: '水野 瑠華' },
  { id: '20260101214', name: '患者' }
]

for (const patient of patients) {
  console.log(`\nInvalidating cache for ${patient.name} (${patient.id})...`)

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
      console.log(`✓ Cache invalidated for ${patient.name} (${patient.id})`)
    } else {
      console.log(`✗ Failed: ${data.error}`)
    }
  } catch (e) {
    console.log(`✗ Error: ${e.message}`)
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 200))
}

console.log('\n=== Complete ===')
