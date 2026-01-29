// 宮崎　洲のキャッシュを無効化
const ADMIN_TOKEN = 'secret'
const patientId = '20260101106'

const res = await fetch('https://app.noname-beauty.jp/api/admin/invalidate-cache', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ patient_id: patientId })
})

const data = await res.json()
console.log('Response:', data)

if (data.ok) {
  console.log(`✓ Cache invalidated for patient ${patientId} (宮崎　洲)`)
} else {
  console.log(`✗ Failed to invalidate cache:`, data.error)
}
