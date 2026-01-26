// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型定義
export type Reservation = {
  id: number
  reserve_id: string
  patient_id: string
  patient_name: string | null
  reserved_date: string
  reserved_time: string
  status: string
  note: string | null
  prescription_menu: string | null
  created_at: string
  updated_at: string
}

export type Intake = {
  id: number
  reserve_id: string
  patient_id: string
  answerer_id: string | null
  line_id: string | null
  patient_name: string | null
  answers: any
  reserved_date: string | null
  reserved_time: string | null
  status: string | null
  note: string | null
  prescription_menu: string | null
  created_at: string
  updated_at: string
}
