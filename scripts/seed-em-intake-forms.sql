-- EMオンラインクリニック: 低用量ピル・アフターピル問診テンプレート＋分野フロー設定
-- tenant_id: bfd0a329-ba40-456d-9c28-c7d32d4ef666

-- ═══════════════════════════════════════════════════════
-- 1. 分野のflow_config設定
-- ═══════════════════════════════════════════════════════

-- メディカルダイエット: 予約→診察→決済（デフォルト）
UPDATE medical_fields SET flow_config = '{"intake_frequency":"once","purchase_flow":"reservation_first","show_in_reorder":true}'::jsonb
WHERE id = '1bce1ba8-28c0-4748-b35c-1c1db7fbe679';

-- 低用量ピル: 問診→予約→診察→決済（1回のみ）
UPDATE medical_fields SET flow_config = '{"intake_frequency":"once","purchase_flow":"intake_reservation_pay","show_in_reorder":true}'::jsonb
WHERE id = '4e195b33-2ad1-449b-b219-f78f62ceebfc';

-- 美容内服: 予約→診察→決済（デフォルト）
UPDATE medical_fields SET flow_config = '{"intake_frequency":"once","purchase_flow":"reservation_first","show_in_reorder":true}'::jsonb
WHERE id = '95ef1cb2-1646-4975-a5bf-b8986144de13';

-- アフターピル: 問診→決済（毎回問診、再処方非表示）
UPDATE medical_fields SET flow_config = '{"intake_frequency":"every_time","purchase_flow":"intake_then_pay","show_in_reorder":false}'::jsonb
WHERE id = '7784c3bc-c960-4d7e-adb9-6db50e2c1e52';

-- ═══════════════════════════════════════════════════════
-- 2. 低用量ピル問診テンプレート
-- ═══════════════════════════════════════════════════════

INSERT INTO intake_form_definitions (tenant_id, name, field_id, is_active, fields, settings) VALUES (
  'bfd0a329-ba40-456d-9c28-c7d32d4ef666',
  '低用量ピル問診',
  '4e195b33-2ad1-449b-b219-f78f62ceebfc',
  true,
  '[
    {
      "id": "ng_check",
      "type": "radio",
      "label": "以下に該当する方は処方できません。該当しますか？",
      "description": "・以前にピルでアレルギーを起こした人\n・エストロゲン依存性のがん（乳がんや子宮がんなど）の患者やその疑いのある人\n・血栓症（肺塞栓症、脳血管障害、冠動脈疾患など）と診断されている人\n・中等度以上の高血圧の人\n・妊娠中の人\n・18歳以下の人\n・35歳以上で1日15本以上喫煙をしている人",
      "required": true,
      "sort_order": 0,
      "options": [{"label": "該当しない", "value": "no"}, {"label": "該当する", "value": "yes"}],
      "ng_block": true,
      "ng_block_value": "yes"
    },
    {
      "id": "pill_name",
      "type": "text",
      "label": "氏名(フルネーム)",
      "placeholder": "例）山田　太郎",
      "required": true,
      "sort_order": 1
    },
    {
      "id": "pill_name_kana",
      "type": "text",
      "label": "氏名(カナ)",
      "placeholder": "例）ヤマダ　タロウ",
      "required": true,
      "sort_order": 2
    },
    {
      "id": "pill_sex",
      "type": "radio",
      "label": "性別",
      "description": "＊男性の方の処方はできません。処方を受けられるご本人様の情報をご入力ください。",
      "required": true,
      "sort_order": 3,
      "options": [{"label": "女性", "value": "女性"}],
      "ng_block": true,
      "ng_block_value": "男性"
    },
    {
      "id": "pill_birthday",
      "type": "date",
      "label": "生年月日",
      "required": true,
      "sort_order": 4
    },
    {
      "id": "pill_delivery",
      "type": "radio",
      "label": "配送先住所",
      "description": "選択後、配送先の郵便番号と住所をご入力ください。（郵便局やコンビニへの発送はできかねます。）",
      "required": true,
      "sort_order": 5,
      "options": [{"label": "自宅", "value": "自宅"}, {"label": "ヤマト運輸営業センター", "value": "営業所"}, {"label": "その他(自宅以外の職場やホテルなど)", "value": "その他"}]
    },
    {
      "id": "pill_id_type",
      "type": "radio",
      "label": "本人確認書類",
      "required": true,
      "sort_order": 6,
      "options": [{"label": "免許証", "value": "免許証"}, {"label": "保険証", "value": "保険証"}, {"label": "パスポート", "value": "パスポート"}, {"label": "マイナンバーカード", "value": "マイナンバーカード"}, {"label": "在留カード", "value": "在留カード"}, {"label": "学生証", "value": "学生証"}]
    },
    {
      "id": "pill_id_image",
      "type": "image",
      "label": "本人確認書類の画像アップロード",
      "description": "書類全体がわかりやすく見えるように画像のアップロードをお願いいたします。",
      "required": true,
      "sort_order": 7
    },
    {
      "id": "pill_disease_yesno",
      "type": "radio",
      "label": "現在治療中、または過去に大きな病気はありますか？",
      "required": true,
      "sort_order": 8,
      "options": [{"label": "はい（下記で疾患名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "pill_disease_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方は疾患名をご入力ください",
      "required": false,
      "sort_order": 9,
      "conditional": {"when": "pill_disease_yesno", "value": "yes"}
    },
    {
      "id": "pill_med_yesno",
      "type": "radio",
      "label": "現在内服中のお薬はありますか？",
      "required": true,
      "sort_order": 10,
      "options": [{"label": "はい（下記で薬剤名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "pill_med_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方は薬剤名をご入力ください",
      "required": false,
      "sort_order": 11,
      "conditional": {"when": "pill_med_yesno", "value": "yes"}
    },
    {
      "id": "pill_allergy_yesno",
      "type": "radio",
      "label": "アレルギーはありますか？",
      "required": true,
      "sort_order": 12,
      "options": [{"label": "はい（下記でアレルギー名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "pill_allergy_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方はアレルギー名をご入力ください",
      "required": false,
      "sort_order": 13,
      "conditional": {"when": "pill_allergy_yesno", "value": "yes"}
    },
    {
      "id": "pill_breastfeeding",
      "type": "radio",
      "label": "現在、授乳中でしょうか？",
      "required": true,
      "sort_order": 14,
      "options": [{"label": "はい", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "pill_last_period",
      "type": "date",
      "label": "前回の月経開始日はいつですか？",
      "required": true,
      "sort_order": 15
    },
    {
      "id": "pill_cycle",
      "type": "text",
      "label": "月経周期を教えてください",
      "placeholder": "例）28日",
      "required": true,
      "sort_order": 16
    },
    {
      "id": "pill_purpose",
      "type": "checkbox",
      "label": "低用量ピルの服用目的",
      "description": "＊複数選択可",
      "required": true,
      "sort_order": 17,
      "options": [{"label": "月経痛の改善", "value": "月経痛の改善"}, {"label": "子宮内膜症の改善", "value": "子宮内膜症の改善"}, {"label": "ニキビや肌荒れの治療", "value": "ニキビや肌荒れの治療"}, {"label": "避妊のため", "value": "避妊のため"}, {"label": "月経不順の改善", "value": "月経不順の改善"}, {"label": "その他", "value": "その他"}]
    },
    {
      "id": "pill_history",
      "type": "radio",
      "label": "現在、または過去に低用量ピルを服用したことがありますか？",
      "required": true,
      "sort_order": 18,
      "options": [{"label": "はい", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    }
  ]'::jsonb,
  '{"step_by_step": true, "header_title": "低用量ピル問診", "ng_block_title": "オンライン処方の対象外です", "ng_block_message": "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。お近くの医療機関をご受診ください。"}'::jsonb
);

-- ═══════════════════════════════════════════════════════
-- 3. アフターピル問診テンプレート
-- ═══════════════════════════════════════════════════════

INSERT INTO intake_form_definitions (tenant_id, name, field_id, is_active, fields, settings) VALUES (
  'bfd0a329-ba40-456d-9c28-c7d32d4ef666',
  'アフターピル問診',
  '7784c3bc-c960-4d7e-adb9-6db50e2c1e52',
  true,
  '[
    {
      "id": "ng_check",
      "type": "radio",
      "label": "以下に該当する方は処方できません。該当しますか？",
      "description": "・以前にアフターピルでアレルギーを起こした人\n・エストロゲン依存性のがん（乳がんや子宮がんなど）の患者やその疑いのある人\n・妊娠中、授乳中の人\n・18歳以下の人\n・35歳以上で1日15本以上喫煙をしている人",
      "required": true,
      "sort_order": 0,
      "options": [{"label": "該当しない", "value": "no"}, {"label": "該当する", "value": "yes"}],
      "ng_block": true,
      "ng_block_value": "yes"
    },
    {
      "id": "ap_name",
      "type": "text",
      "label": "氏名（フルネーム）",
      "placeholder": "例）山田　太郎",
      "required": true,
      "sort_order": 1
    },
    {
      "id": "ap_name_kana",
      "type": "text",
      "label": "氏名(カナ)",
      "placeholder": "ヤマダ　タロウ",
      "required": true,
      "sort_order": 2
    },
    {
      "id": "ap_sex",
      "type": "radio",
      "label": "性別",
      "description": "＊男性の方の処方はできません。処方を受けられるご本人様の情報をご入力ください。",
      "required": true,
      "sort_order": 3,
      "options": [{"label": "女性", "value": "女性"}],
      "ng_block": true,
      "ng_block_value": "男性"
    },
    {
      "id": "ap_birthday",
      "type": "date",
      "label": "生年月日",
      "required": true,
      "sort_order": 4
    },
    {
      "id": "ap_id_type",
      "type": "radio",
      "label": "本人確認書類",
      "description": "申し込み女性ご本人の情報が記載された書類をご用意ください。",
      "required": true,
      "sort_order": 5,
      "options": [{"label": "免許証", "value": "免許証"}, {"label": "保険証", "value": "保険証"}, {"label": "パスポート", "value": "パスポート"}, {"label": "マイナンバーカード", "value": "マイナンバーカード"}, {"label": "在留カード", "value": "在留カード"}, {"label": "学生証", "value": "学生証"}]
    },
    {
      "id": "ap_id_image",
      "type": "image",
      "label": "身分証アップロード",
      "description": "書類全体がわかりやすく見えるように画像のアップロードをお願いいたします。",
      "required": true,
      "sort_order": 6
    },
    {
      "id": "ap_disease_yesno",
      "type": "radio",
      "label": "現在治療中、または過去に大きな病気はありますか？",
      "required": true,
      "sort_order": 7,
      "options": [{"label": "はい（下記で疾患名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "ap_disease_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方は疾患名をご入力ください",
      "required": false,
      "sort_order": 8,
      "conditional": {"when": "ap_disease_yesno", "value": "yes"}
    },
    {
      "id": "ap_allergy_yesno",
      "type": "radio",
      "label": "アレルギーはありますか？",
      "required": true,
      "sort_order": 9,
      "options": [{"label": "はい（下記でアレルギー名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "ap_allergy_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方はアレルギー名をご入力ください",
      "required": false,
      "sort_order": 10,
      "conditional": {"when": "ap_allergy_yesno", "value": "yes"}
    },
    {
      "id": "ap_med_yesno",
      "type": "radio",
      "label": "現在内服中のお薬はありますか？",
      "required": true,
      "sort_order": 11,
      "options": [{"label": "はい（下記で薬剤名を記載してください）", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "ap_med_detail",
      "type": "textarea",
      "label": "上記で「はい」と答えられた方は薬剤名をご入力ください",
      "required": false,
      "sort_order": 12,
      "conditional": {"when": "ap_med_yesno", "value": "yes"}
    },
    {
      "id": "ap_liver",
      "type": "radio",
      "label": "最近医療機関で肝機能障害があると指摘されましたか？",
      "required": true,
      "sort_order": 13,
      "options": [{"label": "はい", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "ap_intercourse_date",
      "type": "date",
      "label": "性行為があった日にちはいつでしょうか。",
      "required": true,
      "sort_order": 14
    },
    {
      "id": "ap_intercourse_time",
      "type": "text",
      "label": "性行為があった時間は何時でしょうか",
      "placeholder": "例）17",
      "description": "24時間表記で数字のみ入力してください。",
      "required": true,
      "sort_order": 15
    },
    {
      "id": "ap_pregnant",
      "type": "radio",
      "label": "現在、妊娠中でしょうか？",
      "description": "＊妊娠中の方への処方はできません",
      "required": true,
      "sort_order": 16,
      "options": [{"label": "いいえ", "value": "no"}],
      "ng_block": true,
      "ng_block_value": "yes"
    },
    {
      "id": "ap_breastfeeding",
      "type": "radio",
      "label": "現在、授乳中ですか？",
      "required": true,
      "sort_order": 17,
      "options": [{"label": "はい", "value": "yes"}, {"label": "いいえ", "value": "no"}]
    },
    {
      "id": "ap_last_period",
      "type": "date",
      "label": "前回の月経開始日はいつですか？",
      "required": true,
      "sort_order": 18
    },
    {
      "id": "ap_cycle",
      "type": "text",
      "label": "月経周期を教えてください",
      "placeholder": "例）28日",
      "required": true,
      "sort_order": 19
    }
  ]'::jsonb,
  '{"step_by_step": true, "header_title": "アフターピル問診", "ng_block_title": "オンライン処方の対象外です", "ng_block_message": "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。お近くの医療機関をご受診ください。"}'::jsonb
);

-- ═══════════════════════════════════════════════════════
-- 4. マルチ分野モードを有効化
-- ═══════════════════════════════════════════════════════

INSERT INTO tenant_settings (tenant_id, category, key, value)
VALUES ('bfd0a329-ba40-456d-9c28-c7d32d4ef666', 'medical_fields', 'config', '{"multiFieldEnabled":true}')
ON CONFLICT (tenant_id, category, key) DO UPDATE SET value = '{"multiFieldEnabled":true}', updated_at = NOW();
