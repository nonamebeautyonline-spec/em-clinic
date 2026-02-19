-- NPS調査テーブル
CREATE TABLE IF NOT EXISTS nps_surveys (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  title VARCHAR(200) NOT NULL,
  question_text TEXT NOT NULL DEFAULT 'この施設を友人や知人にどの程度おすすめしたいですか？',
  comment_label TEXT DEFAULT 'ご意見・ご感想があればお聞かせください',
  thank_you_message TEXT DEFAULT 'ご回答ありがとうございます',
  is_active BOOLEAN DEFAULT true,
  auto_send_after VARCHAR(20) DEFAULT NULL, -- 'visit' | 'purchase' | NULL(手動のみ)
  auto_send_delay_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPS回答テーブル
CREATE TABLE IF NOT EXISTS nps_responses (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  survey_id INTEGER NOT NULL REFERENCES nps_surveys(id) ON DELETE CASCADE,
  patient_id VARCHAR(20),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_nps_surveys_tenant ON nps_surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_tenant ON nps_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey_id ON nps_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_patient_id ON nps_responses(patient_id);
