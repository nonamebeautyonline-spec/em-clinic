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

// Get one record to see the structure
const { data, error } = await supabase
  .from('intake')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

if (data.length > 0) {
  console.log('Supabase intake table fields:')
  console.log(Object.keys(data[0]))
  console.log('\nSample record:')
  console.log(JSON.stringify(data[0], null, 2))
}
