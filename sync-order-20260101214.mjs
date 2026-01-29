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

const pid = '20260101214'

console.log('=== Syncing order for patient 20260101214 ===\n')

// GASから注文情報を取得
const gasUrl = `${env.GAS_MYPAGE_URL}?type=getDashboard&patient_id=${pid}&full=1`
const gasRes = await fetch(gasUrl)
const gasData = await gasRes.json()

console.log('GAS orders:', gasData.orders?.length || 0)

if (!gasData.orders || gasData.orders.length === 0) {
  console.log('No orders from GAS')
  process.exit(1)
}

const gasOrder = gasData.orders[0]
console.log('\nGAS Order data:')
console.log(JSON.stringify(gasOrder, null, 2))

// paid_at_jst を ISO 形式に変換
function toIsoFromJst(jstDateTime) {
  if (!jstDateTime) return null

  // "2026/01/27 11:37:56" -> "2026-01-27T11:37:56+09:00"
  const match = jstDateTime.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (match) {
    const [, y, m, d, hh, mm, ss] = match
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`
  }
  return null
}

const orderToInsert = {
  id: gasOrder.id,
  patient_id: pid,
  product_code: gasOrder.product_code || '',
  product_name: gasOrder.product_name || '',
  amount: gasOrder.amount || 0,
  paid_at: toIsoFromJst(gasOrder.paid_at_jst),
  shipping_status: gasOrder.shipping_status || 'pending',
  shipping_date: gasOrder.shipping_eta || null,
  tracking_number: gasOrder.tracking_number || null,
  carrier: gasOrder.carrier || null,
  payment_status: gasOrder.payment_status || 'paid',
  refund_status: gasOrder.refund_status || null,
  refunded_at: gasOrder.refunded_at_jst ? toIsoFromJst(gasOrder.refunded_at_jst) : null,
  refunded_amount: gasOrder.refunded_amount || null
}

console.log('\nData to insert:')
console.log(JSON.stringify(orderToInsert, null, 2))

const { data, error } = await supabase
  .from('orders')
  .upsert(orderToInsert, { onConflict: 'id' })
  .select()

if (error) {
  console.error('\n✗ Error inserting order:', error)
  process.exit(1)
} else {
  console.log('\n✓ Order synced successfully!')
  console.log('Inserted/Updated:', data)
}
