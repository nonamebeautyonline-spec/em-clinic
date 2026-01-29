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

console.log('=== Checking orders table schema ===\n')

// サンプルデータを1件取得してスキーマを確認
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error)
} else if (data && data.length > 0) {
  console.log('Sample order:')
  console.log(JSON.stringify(data[0], null, 2))
  console.log('\nColumns:')
  console.log(Object.keys(data[0]).join(', '))
} else {
  console.log('No orders in table - checking if table exists')

  // テーブルが空の場合、insertを試みてエラーメッセージからスキーマを推測
  const { error: insertError } = await supabase
    .from('orders')
    .insert({ id: 'test' })

  if (insertError) {
    console.log('Insert error (expected):')
    console.log(insertError.message)
  }
}
