// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// クライアント用（RLS有効）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバーサイドAPI用（RLSバイパス）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// ⚠️ intake テーブル注意:
// patient_id にユニーク制約がない（再処方カルテで同一患者に複数レコードを持つため）。
// upsert({ onConflict: "patient_id" }) は使用禁止 → select→insert/update パターンを使うこと。

// 型定義
export type Patient = {
  id: number
  patient_id: string
  name: string | null
  name_kana: string | null
  tel: string | null
  sex: string | null
  birthday: string | null
  line_id: string | null
  square_customer_id: string | null
  square_card_id: string | null
  created_at: string
  updated_at: string
}

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
