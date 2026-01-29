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

console.log('=== Checking patient 20260101214 ===\n')

// intakeテーブルを確認
const { data: intake } = await supabase
  .from('intake')
  .select('*')
  .eq('patient_id', pid)
  .single()

console.log('Intake data:')
console.log('patient_id:', intake.patient_id)
console.log('patient_name:', intake.patient_name)
console.log('status:', intake.status)
console.log('reserved_date:', intake.reserved_date)
console.log('prescription_menu:', intake.prescription_menu)
console.log('note:', intake.note)
console.log('')

// ordersテーブルを確認
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('patient_id', pid)

console.log('Orders count:', orders?.length || 0)
if (orders && orders.length > 0) {
  console.log('Orders:')
  for (const order of orders) {
    console.log('  id:', order.id)
    console.log('  product_name:', order.product_name)
    console.log('  amount:', order.amount)
    console.log('  paid_at:', order.paid_at)
    console.log('  payment_status:', order.payment_status)
    console.log('')
  }
} else {
  console.log('No orders found in Supabase')
}

// GASから取得してみる
console.log('\n=== Checking GAS getDashboard ===')
const gasUrl = `${env.GAS_MYPAGE_URL}?type=getDashboard&patient_id=${pid}`
const gasRes = await fetch(gasUrl)
const gasData = await gasRes.json()

console.log('GAS orders count:', gasData.orders?.length || 0)
if (gasData.orders && gasData.orders.length > 0) {
  console.log('GAS Orders:')
  for (const order of gasData.orders) {
    console.log('  id:', order.id)
    console.log('  product_name:', order.product_name)
    console.log('  amount:', order.amount)
    console.log('  paid_at_jst:', order.paid_at_jst)
    console.log('')
  }
}
