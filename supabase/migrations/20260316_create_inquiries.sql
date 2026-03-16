-- お問い合わせフォーム用テーブル
CREATE TABLE inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text,                -- 会社名（個人の場合はnull）
  contact_name text NOT NULL,       -- 担当者氏名
  service_name text,                -- サービス名（任意）
  implementation_timing text,       -- 導入希望時期
  has_existing_line boolean DEFAULT false, -- 既存のLINEシステムの有無
  existing_line_detail text,        -- 既存LINEシステムの詳細
  message text,                     -- 自由記述欄
  email text NOT NULL,              -- 返信先メールアドレス
  phone text,                       -- 電話番号
  status text DEFAULT 'unread',     -- unread / read / replied
  note text,                        -- 管理者メモ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON inquiries
  FOR ALL USING (auth.role() = 'service_role');
