-- 問診フォーム定義テーブル
-- テナントごとに1つの問診フォーム定義を持つ
CREATE TABLE IF NOT EXISTS intake_form_definitions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(200) NOT NULL DEFAULT '問診フォーム',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

ALTER TABLE intake_form_definitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_only" ON intake_form_definitions
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_intake_form_defs_tenant
  ON intake_form_definitions(tenant_id);

-- のなめクリニックのデフォルト問診フォーム（tenant_id = NULL）
INSERT INTO intake_form_definitions (tenant_id, name, fields, settings) VALUES (
  NULL,
  '問診フォーム',
  '[
    {
      "id": "ng_check",
      "type": "radio",
      "label": "【以下のいずれかに該当する方は処方できません】",
      "description": "・1型糖尿病の既往がある\n・妊娠中・授乳中である\n・重症ケトーシス／糖尿病性昏睡・前昏睡／重症感染症・重篤な外傷がある\n・手術前後2週間以内である\n・現在、糖尿病治療中である\n・18歳未満、または65歳以上である\n・拒食症など重度の栄養障害の既往がある\n（女性）妊娠を直近1ヶ月以内で希望している",
      "required": true,
      "options": [
        { "label": "以上のいずれにも該当しません", "value": "no" },
        { "label": "該当する項目があります", "value": "yes" }
      ],
      "sort_order": 0,
      "ng_block": true,
      "ng_block_value": "yes"
    },
    {
      "id": "current_disease_yesno",
      "type": "radio",
      "label": "現在治療中、または過去に大きな病気はありますか？",
      "required": true,
      "options": [
        { "label": "はい", "value": "yes" },
        { "label": "いいえ", "value": "no" }
      ],
      "sort_order": 1
    },
    {
      "id": "current_disease_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えた方は疾患名や状況をご記入ください",
      "required": true,
      "placeholder": "例）高血圧で内科通院中／過去に肺炎で入院 など",
      "sort_order": 2,
      "conditional": { "when": "current_disease_yesno", "value": "yes" }
    },
    {
      "id": "glp_history",
      "type": "textarea",
      "label": "GLP-1/GIP製剤（マンジャロ、リベルサス、オゼンピックなど）の使用歴があればご記入ください",
      "required": false,
      "placeholder": "例）マンジャロ5mg 使用中／オゼンピック0.5mg 2025年10月まで など",
      "sort_order": 3
    },
    {
      "id": "med_yesno",
      "type": "radio",
      "label": "現在、内服中のお薬はありますか？",
      "required": true,
      "options": [
        { "label": "はい", "value": "yes" },
        { "label": "いいえ", "value": "no" }
      ],
      "sort_order": 4
    },
    {
      "id": "med_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えた方は薬剤名をご記入ください",
      "description": "常用薬の他、リベルサスやマンジャロなどメディカルダイエット薬も含めてご記入ください",
      "required": true,
      "placeholder": "",
      "sort_order": 5,
      "conditional": { "when": "med_yesno", "value": "yes" }
    },
    {
      "id": "allergy_yesno",
      "type": "radio",
      "label": "アレルギーはありますか？",
      "required": true,
      "options": [
        { "label": "はい", "value": "yes" },
        { "label": "いいえ", "value": "no" }
      ],
      "sort_order": 6
    },
    {
      "id": "allergy_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えた方はアレルギー名をご記入ください",
      "required": true,
      "sort_order": 7,
      "conditional": { "when": "allergy_yesno", "value": "yes" }
    },
    {
      "id": "entry_route",
      "type": "radio",
      "label": "今回のお申し込みは何を見てされましたか？",
      "required": true,
      "options": [
        { "label": "X（旧Twitter）", "value": "twitter" },
        { "label": "Instagram", "value": "instagram" },
        { "label": "ホームページ", "value": "homepage" },
        { "label": "検索サイト", "value": "search" },
        { "label": "知人からの紹介", "value": "friend" },
        { "label": "その他", "value": "other" }
      ],
      "sort_order": 8
    },
    {
      "id": "entry_other",
      "type": "text",
      "label": "「その他」を選んだ方は具体的にご記入ください",
      "required": true,
      "sort_order": 9,
      "conditional": { "when": "entry_route", "value": "other" }
    }
  ]'::jsonb,
  '{
    "step_by_step": true,
    "header_title": "問診",
    "estimated_time": "平均回答時間 1〜2分程度",
    "ng_block_title": "オンライン処方の対象外です",
    "ng_block_message": "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。お手数ですが、対面診療が可能な医療機関でのご相談をご検討ください。"
  }'::jsonb
) ON CONFLICT (tenant_id) DO NOTHING;
