-- キャンセル待ちテーブル
CREATE TABLE reservation_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  patient_id TEXT NOT NULL,
  line_uid TEXT,
  target_date DATE NOT NULL,
  target_time TIME,
  slot_id UUID,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'expired', 'cancelled')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, patient_id, target_date, target_time)
);
ALTER TABLE reservation_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON reservation_waitlist FOR ALL USING (auth.role() = 'service_role');
