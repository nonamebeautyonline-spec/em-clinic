import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// patient_nameが空のレコードを確認
const { data, error } = await supabase
  .from('intake')
  .select('reserve_id, patient_id, patient_name, created_at')
  .order('created_at', { ascending: false })
  .limit(50)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`Total records fetched: ${data.length}`)

const emptyNames = data.filter(row => !row.patient_name || row.patient_name.trim() === '')
console.log(`\nRecords with empty patient_name: ${emptyNames.length}`)

if (emptyNames.length > 0) {
  console.log('\nSample records with empty patient_name:')
  emptyNames.slice(0, 10).forEach(row => {
    console.log(`- reserve_id: ${row.reserve_id}, patient_id: ${row.patient_id}, created_at: ${row.created_at}`)
  })
}

const withNames = data.filter(row => row.patient_name && row.patient_name.trim() !== '')
console.log(`\nRecords with patient_name: ${withNames.length}`)

if (withNames.length > 0) {
  console.log('\nSample records with patient_name:')
  withNames.slice(0, 3).forEach(row => {
    console.log(`- reserve_id: ${row.reserve_id}, patient_name: ${row.patient_name}`)
  })
}
