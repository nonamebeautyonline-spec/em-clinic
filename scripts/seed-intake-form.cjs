// scripts/seed-intake-form.cjs — 問診フォーム定義をDBに反映（現行設定）
const { Client } = require("pg");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/seed-intake-form.cjs <PGPASSWORD>");
  process.exit(1);
}

const client = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432,
  user: "cli_login_postgres.fzfkgemtaxsrocbucmza",
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

// 現行の問診フォーム定義（QuestionnairePage.tsx と完全一致）
const fields = [
  {
    id: "ng_check",
    type: "radio",
    label: "【以下のいずれかに該当する方は処方できません】",
    description: "・1型糖尿病の既往がある\n・妊娠中・授乳中である\n・重症ケトーシス／糖尿病性昏睡・前昏睡／重症感染症・重篤な外傷がある\n・手術前後2週間以内である\n・現在、糖尿病治療中である\n・18歳未満、または65歳以上である\n・拒食症など重度の栄養障害の既往がある\n（女性）妊娠を直近1ヶ月以内で希望している",
    required: true,
    options: [
      { label: "以上のいずれにも該当しません", value: "no" },
      { label: "該当する項目があります", value: "yes" },
    ],
    sort_order: 0,
    ng_block: true,
    ng_block_value: "yes",
  },
  {
    id: "current_disease_yesno",
    type: "radio",
    label: "現在治療中、または過去に大きな病気はありますか？",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
    sort_order: 1,
  },
  {
    id: "current_disease_detail",
    type: "textarea",
    label: "上記で「はい」と答えた方は疾患名や状況をご記入ください",
    required: true,
    placeholder: "例）高血圧で内科通院中／過去に肺炎で入院 など",
    sort_order: 2,
    conditional: { when: "current_disease_yesno", value: "yes" },
  },
  {
    id: "glp_history",
    type: "textarea",
    label: "GLP-1/GIP製剤（マンジャロ、リベルサス、オゼンピックなど）の使用歴があればご記入ください",
    required: false,
    placeholder: "例）マンジャロ7.5mg 使用中／オゼンピック1mg 2024年8月まで など",
    sort_order: 3,
  },
  {
    id: "med_yesno",
    type: "radio",
    label: "現在、内服中のお薬はありますか？",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
    sort_order: 4,
  },
  {
    id: "med_detail",
    type: "textarea",
    label: "上記で「はい」と答えた方は薬剤名をご記入ください",
    description: "常用薬の他、リベルサスやマンジャロなどメディカルダイエット薬も含めてご記入ください",
    required: true,
    sort_order: 5,
    conditional: { when: "med_yesno", value: "yes" },
  },
  {
    id: "allergy_yesno",
    type: "radio",
    label: "アレルギーはありますか？",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
    sort_order: 6,
  },
  {
    id: "allergy_detail",
    type: "textarea",
    label: "上記で「はい」と答えた方はアレルギー名をご記入ください",
    required: true,
    sort_order: 7,
    conditional: { when: "allergy_yesno", value: "yes" },
  },
  {
    id: "entry_route",
    type: "radio",
    label: "今回のお申し込みは何を見てされましたか？",
    required: true,
    options: [
      { label: "Twitter", value: "twitter" },
      { label: "Instagram", value: "instagram" },
      { label: "ホームページ", value: "homepage" },
      { label: "検索サイト", value: "search" },
      { label: "知人からの紹介", value: "friend" },
      { label: "その他", value: "other" },
    ],
    sort_order: 8,
  },
  {
    id: "entry_other",
    type: "text",
    label: "「その他」を選んだ方は具体的にご記入ください",
    required: true,
    sort_order: 9,
    conditional: { when: "entry_route", value: "other" },
  },
];

const settings = {
  step_by_step: true,
  header_title: "問診",
  estimated_time: "平均回答時間 1〜2分程度",
  ng_block_title: "オンライン処方の対象外です",
  ng_block_message: "恐れ入りますが、問診項目のいずれかに該当する場合はオンラインでの処方ができかねます。お手数ですが、対面診療が可能な医療機関でのご相談をご検討ください。",
};

async function run() {
  await client.connect();
  await client.query("SET ROLE postgres;");
  console.log("Connected (postgres role)");

  // 1. テーブル存在確認
  const { rows: tableCheck } = await client.query(
    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'intake_form_definitions') AS exists"
  );

  if (!tableCheck[0].exists) {
    console.log("⚠ intake_form_definitions テーブルが存在しません。作成します...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS intake_form_definitions (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        name VARCHAR(200) NOT NULL DEFAULT '問診フォーム',
        fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id)
      );
    `);
    await client.query("ALTER TABLE intake_form_definitions ENABLE ROW LEVEL SECURITY;");
    await client.query(`
      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON intake_form_definitions
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_intake_form_defs_tenant ON intake_form_definitions(tenant_id);");
    console.log("✓ テーブル作成完了");
  } else {
    console.log("✓ テーブル存在確認OK");
  }

  // 2. 既存データ確認
  const { rows: existing } = await client.query(
    "SELECT id, name FROM intake_form_definitions WHERE tenant_id IS NULL"
  );

  const fieldsJson = JSON.stringify(fields);
  const settingsJson = JSON.stringify(settings);

  if (existing.length > 0) {
    // UPDATE
    console.log(`既存レコード(id=${existing[0].id})を更新します...`);
    await client.query(
      "UPDATE intake_form_definitions SET fields = $1::jsonb, settings = $2::jsonb, updated_at = NOW() WHERE id = $3",
      [fieldsJson, settingsJson, existing[0].id]
    );
    console.log("✓ 更新完了");
  } else {
    // INSERT
    console.log("新規レコードを挿入します...");
    await client.query(
      "INSERT INTO intake_form_definitions (tenant_id, name, fields, settings) VALUES (NULL, '問診フォーム', $1::jsonb, $2::jsonb)",
      [fieldsJson, settingsJson]
    );
    console.log("✓ 挿入完了");
  }

  // 3. 確認
  const { rows: result } = await client.query(
    "SELECT id, name, jsonb_array_length(fields) as field_count, settings->>'header_title' as title FROM intake_form_definitions WHERE tenant_id IS NULL"
  );
  console.log("\n=== intake_form_definitions ===");
  for (const r of result) {
    console.log(`  [${r.id}] ${r.name} | フィールド数: ${r.field_count} | タイトル: ${r.title}`);
  }

  // フィールド一覧も表示
  const { rows: fieldRows } = await client.query(
    "SELECT f->>'id' as fid, f->>'type' as ftype, f->>'label' as flabel FROM intake_form_definitions, jsonb_array_elements(fields) AS f WHERE tenant_id IS NULL ORDER BY (f->>'sort_order')::int"
  );
  console.log("\nフィールド一覧:");
  for (const f of fieldRows) {
    console.log(`  [${f.fid}] ${f.ftype} — ${f.flabel.substring(0, 40)}...`);
  }

  await client.end();
  console.log("\n完了!");
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
