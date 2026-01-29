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

const today = '2026-01-27'

// Get all today's reservations
const { data, error } = await supabase
  .from('intake')
  .select('patient_id, patient_name, reserve_id, reserved_date, reserved_time, answerer_id, line_id, status, answers')
  .eq('reserved_date', today)
  .order('reserved_time', { ascending: true })

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`\n=== Today's reservations (${today}): ${data.length} records ===\n`)

let incomplete = 0
let missingAnswererIds = []
let missingBasicInfo = []
let emptyAnswers = []

for (const row of data) {
  const ans = row.answers || {}
  const hasAnswererIdInRecord = row.answerer_id && row.answerer_id.trim() !== ''
  const hasBasicInfo = ans.name_kana || ans.sex || ans.birth || ans.tel
  const hasQuestionnaireAnswers = ans.ng_check || ans.med_yesno || ans.allergy_yesno

  let isIncomplete = false
  let reasons = []

  if (!hasAnswererIdInRecord) {
    isIncomplete = true
    reasons.push('answerer_id missing')
    missingAnswererIds.push(row.patient_id)
  }

  if (!hasBasicInfo) {
    isIncomplete = true
    reasons.push('basic info missing (name_kana/sex/birth/tel)')
    missingBasicInfo.push(row.patient_id)
  }

  if (!hasQuestionnaireAnswers) {
    isIncomplete = true
    reasons.push('questionnaire answers missing')
    emptyAnswers.push(row.patient_id)
  }

  if (isIncomplete) {
    incomplete++
    console.log(`❌ ${row.patient_name || '(no name)'} (${row.patient_id})`)
    console.log(`   reserve_id: ${row.reserve_id}`)
    console.log(`   reserved_time: ${row.reserved_time}`)
    console.log(`   answerer_id: ${row.answerer_id || '(empty)'}`)
    console.log(`   line_id: ${row.line_id || '(empty)'}`)
    console.log(`   status: ${row.status || '(empty)'}`)
    console.log(`   Issues: ${reasons.join(', ')}`)
    console.log(`   answers keys: ${Object.keys(ans).join(', ') || '(empty)'}`)
    console.log('')
  }
}

console.log(`\n=== Summary ===`)
console.log(`Total today's records: ${data.length}`)
console.log(`Incomplete records: ${incomplete}`)
console.log(`Complete records: ${data.length - incomplete}`)
console.log(`\nRecords missing answerer_id: ${missingAnswererIds.length}`)
console.log(`Records missing basic info: ${missingBasicInfo.length}`)
console.log(`Records missing questionnaire: ${emptyAnswers.length}`)

if (incomplete > 0) {
  console.log(`\n=== Patient IDs with incomplete data ===`)
  const allIncomplete = new Set([...missingAnswererIds, ...missingBasicInfo, ...emptyAnswers])
  console.log(Array.from(allIncomplete).join('\n'))
}
