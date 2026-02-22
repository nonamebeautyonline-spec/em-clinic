// scripts/run-reminder-migration.cjs — リマインドルール マイグレーション + デフォルト設定
const { Client } = require("pg");

// supabase CLI credentials取得用のパスワードは引数で渡す
const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/run-reminder-migration.cjs <PGPASSWORD>");
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

async function run() {
  await client.connect();
  await client.query("SET ROLE postgres;");
  console.log("Connected (postgres role)");

  // 1. reminder_rules テーブル
  await client.query(`
    CREATE TABLE IF NOT EXISTS reminder_rules (
      id SERIAL PRIMARY KEY,
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      timing_type VARCHAR(20) NOT NULL DEFAULT 'before_hours',
      timing_value INTEGER NOT NULL DEFAULT 24,
      message_template TEXT NOT NULL DEFAULT '',
      is_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✓ reminder_rules テーブル");

  // 2. reminder_sent_log テーブル
  await client.query(`
    CREATE TABLE IF NOT EXISTS reminder_sent_log (
      id SERIAL PRIMARY KEY,
      tenant_id UUID,
      rule_id INTEGER NOT NULL REFERENCES reminder_rules(id) ON DELETE CASCADE,
      reservation_id BIGINT NOT NULL,
      scheduled_message_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(rule_id, reservation_id)
    );
  `);
  console.log("✓ reminder_sent_log テーブル");

  // 3. インデックス
  await client.query("CREATE INDEX IF NOT EXISTS idx_reminder_rules_tenant ON reminder_rules(tenant_id);");
  await client.query("CREATE INDEX IF NOT EXISTS idx_reminder_sent_log_tenant ON reminder_sent_log(tenant_id);");
  await client.query("CREATE INDEX IF NOT EXISTS idx_reminder_sent_log_rule ON reminder_sent_log(rule_id);");
  console.log("✓ インデックス");

  // 4. 固定時刻カラム追加
  await client.query("ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS send_hour INTEGER;");
  await client.query("ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS send_minute INTEGER DEFAULT 0;");
  await client.query("ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS target_day_offset INTEGER DEFAULT 1;");
  await client.query("ALTER TABLE reminder_rules ADD COLUMN IF NOT EXISTS message_format VARCHAR(10) DEFAULT 'text';");
  console.log("✓ 固定時刻カラム追加");

  // 5. scheduled_messages に flex_json カラム追加
  await client.query("ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS flex_json JSONB;");
  console.log("✓ scheduled_messages flex_json");

  // 6. RLS ポリシー
  await client.query("ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;");
  await client.query("ALTER TABLE reminder_sent_log ENABLE ROW LEVEL SECURITY;");
  await client.query(`
    DO $$ BEGIN
      CREATE POLICY "service_role_all" ON reminder_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      CREATE POLICY "service_role_all" ON reminder_sent_log FOR ALL TO service_role USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("✓ RLSポリシー");

  // 7. デフォルトルールINSERT
  const { rows: existing } = await client.query("SELECT COUNT(*) as cnt FROM reminder_rules;");
  const cnt = parseInt(existing[0].cnt);
  if (cnt > 0) {
    console.log("⚠ 既にルールが" + cnt + "件あるためINSERTスキップ");
  } else {
    // ルール1: 前日 19:00 FLEX
    await client.query(`
      INSERT INTO reminder_rules (name, timing_type, timing_value, message_template, is_enabled, send_hour, send_minute, target_day_offset, message_format)
      VALUES ($1, 'fixed_time', 0, '', true, 19, 0, 1, 'flex');
    `, ["前日リマインド（FLEX）"]);
    console.log("✓ ルール1: 前日 19:00 FLEX");

    // ルール2: 当日 8:30 テキスト
    const morningTemplate = `{name}様

本日、診療のご予約がございます。

予約日時：{date} {time}

詳細につきましてはマイページよりご確認ください。

診療は、予約時間枠の間に「090-」から始まる番号よりお電話いたします。
知らない番号からの着信を受け取れない設定になっている場合は、
事前にご連絡いただけますと幸いです。

なお、診療時間にご連絡なくご対応いただけなかった場合、
次回以降のご予約が取りづらくなる可能性がございます。

キャンセルや予約内容の変更をご希望の場合は、
必ず事前にマイページよりお手続きをお願いいたします。

本日もどうぞよろしくお願いいたします。`;

    await client.query(`
      INSERT INTO reminder_rules (name, timing_type, timing_value, message_template, is_enabled, send_hour, send_minute, target_day_offset, message_format)
      VALUES ($1, 'fixed_time', 0, $2, true, 8, 30, 0, 'text');
    `, ["当日リマインド", morningTemplate]);
    console.log("✓ ルール2: 当日 8:30 テキスト");
  }

  // 確認
  const { rows: rules } = await client.query(
    "SELECT id, name, timing_type, send_hour, send_minute, target_day_offset, message_format, is_enabled FROM reminder_rules ORDER BY id;"
  );
  console.log("\n=== reminder_rules ===");
  for (const r of rules) {
    const time = r.send_hour !== null ? r.send_hour + ":" + String(r.send_minute || 0).padStart(2, "0") : "-";
    const day = r.target_day_offset === 0 ? "当日" : "前日";
    const status = r.is_enabled ? "有効" : "停止";
    console.log(`  [${r.id}] ${r.name} | ${r.timing_type} | ${time} | ${day} | ${r.message_format} | ${status}`);
  }

  const { rows: cols } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'scheduled_messages' AND column_name = 'flex_json';"
  );
  console.log("\nscheduled_messages.flex_json: " + (cols.length > 0 ? "✓ 存在" : "✗ 未追加"));

  await client.end();
  console.log("\n完了!");
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
