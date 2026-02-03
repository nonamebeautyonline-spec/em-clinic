-- Drシフト管理用テーブル作成
-- Supabase SQL Editorで実行してください

-- 医師マスタ
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  doctor_id VARCHAR(50) UNIQUE NOT NULL,
  doctor_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 週間ルール
CREATE TABLE IF NOT EXISTS doctor_weekly_rules (
  id SERIAL PRIMARY KEY,
  doctor_id VARCHAR(50) NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  enabled BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  slot_minutes INTEGER DEFAULT 15,
  capacity INTEGER DEFAULT 2,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, weekday)
);

-- 日別例外
CREATE TABLE IF NOT EXISTS doctor_date_overrides (
  id SERIAL PRIMARY KEY,
  doctor_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('closed', 'open', 'modify')),
  start_time TIME,
  end_time TIME,
  slot_minutes INTEGER,
  capacity INTEGER,
  memo TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_weekly_rules_doctor ON doctor_weekly_rules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_overrides_doctor_date ON doctor_date_overrides(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_overrides_date ON doctor_date_overrides(date);
