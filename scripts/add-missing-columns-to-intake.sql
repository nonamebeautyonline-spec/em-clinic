-- Add missing columns to intake table
-- These columns are needed to store patient contact information

ALTER TABLE intake
  ADD COLUMN IF NOT EXISTS patient_kana TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_intake_phone ON intake(phone);
CREATE INDEX IF NOT EXISTS idx_intake_patient_kana ON intake(patient_kana);

-- Add comments
COMMENT ON COLUMN intake.patient_kana IS '患者名カナ';
COMMENT ON COLUMN intake.phone IS '電話番号';
COMMENT ON COLUMN intake.email IS 'メールアドレス';
