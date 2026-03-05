-- patient_vitals: バイタルサイン記録テーブル
CREATE TABLE patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  intake_id BIGINT REFERENCES intake(id),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(5,1),
  height_cm NUMERIC(5,1),
  bmi NUMERIC(4,1),
  systolic_bp INT,
  diastolic_bp INT,
  pulse INT,
  temperature NUMERIC(4,1),
  spo2 INT,
  respiratory_rate INT,
  waist_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON patient_vitals
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_patient_vitals_patient ON patient_vitals(patient_id, tenant_id);
