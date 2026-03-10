-- SaaS申し込みフォーム用テーブル
CREATE TABLE applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  platform_name text,
  industry text NOT NULL,
  contact_phone text NOT NULL,
  email text NOT NULL,
  plan text NOT NULL,
  ai_options text[] DEFAULT '{}',
  setup_options text[] DEFAULT '{}',
  monthly_estimate integer DEFAULT 0,
  initial_estimate integer DEFAULT 0,
  note text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON applications
  FOR ALL USING (auth.role() = 'service_role');
