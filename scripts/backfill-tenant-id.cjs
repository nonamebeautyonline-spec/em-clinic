// 既存データの tenant_id = NULL を noname-beauty テナントの UUID で埋めるスクリプト
// 対象: マイグレーション 20260225_add_tenant_id.sql で追加された全42テーブル + tenant_settings, products
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// マイグレーションで tenant_id を追加した全テーブル + 元々あった2テーブル
const TABLES = [
  "patients", "intake", "reservations", "orders", "reorders",
  "message_log", "message_templates", "broadcasts", "scheduled_messages",
  "rich_menus", "tag_definitions", "patient_tags", "patient_marks",
  "mark_definitions", "friend_field_definitions", "friend_field_values",
  "friend_add_settings", "template_categories", "media_folders", "media_files",
  "forms", "form_responses", "form_file_uploads", "form_folders",
  "actions", "action_folders", "keyword_auto_replies",
  "step_scenarios", "step_items", "step_enrollments",
  "flex_presets", "click_tracking_links", "click_tracking_events",
  "chat_reads", "doctors", "doctor_weekly_rules", "doctor_date_overrides",
  "booking_open_settings", "admin_users", "password_reset_tokens",
  "shipping_shares", "karte_images", "karte_templates", "monthly_financials",
  "media",
  // 元々 tenant_id があったテーブル
  "tenant_settings", "products",
  // その他追加テーブル
  "audit_logs", "admin_sessions", "reminder_rules",
  "intake_form_definitions", "line_daily_stats", "nps_surveys", "coupons",
  "inventory_logs",
  // Phase 2-4 で追加されたテーブル
  "followup_rules", "followup_logs", "dedup_candidates", "undo_history",
  "ai_reply_feedback",
];

const SLUG = "noname-beauty";

async function main() {
  // 1. テナントUUID取得
  const { data: tenant, error: tenantErr } = await sb
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", SLUG)
    .maybeSingle();

  if (tenantErr) {
    console.error("テナント取得エラー:", tenantErr.message);
    process.exit(1);
  }
  if (!tenant) {
    console.error(`テナント slug="${SLUG}" が見つかりません`);
    process.exit(1);
  }

  console.log(`テナント: ${tenant.name} (${tenant.slug})`);
  console.log(`UUID: ${tenant.id}`);
  console.log(`対象テーブル数: ${TABLES.length}`);
  console.log("---");

  // 2. DRY RUN: 各テーブルの NULL 件数を事前チェック
  const counts = {};
  for (const table of TABLES) {
    try {
      const { count, error } = await sb
        .from(table)
        .select("*", { count: "exact", head: true })
        .is("tenant_id", null);
      if (error) {
        // テーブルが存在しない等
        counts[table] = `エラー: ${error.message}`;
      } else {
        counts[table] = count || 0;
      }
    } catch (e) {
      counts[table] = `例外: ${e.message}`;
    }
  }

  console.log("\n=== NULL件数 ===");
  let totalNull = 0;
  for (const [table, count] of Object.entries(counts)) {
    if (typeof count === "number" && count > 0) {
      console.log(`  ${table}: ${count}件`);
      totalNull += count;
    } else if (typeof count === "string") {
      console.log(`  ${table}: ${count}`);
    }
  }
  console.log(`\n合計: ${totalNull}件を更新予定`);

  // 3. --dry-run フラグチェック
  if (process.argv.includes("--dry-run")) {
    console.log("\n[DRY RUN] 実際の更新はスキップしました");
    return;
  }

  // 4. 実行
  console.log("\n=== バックフィル実行 ===");
  let updated = 0;
  let errors = 0;

  for (const table of TABLES) {
    const count = counts[table];
    if (typeof count !== "number" || count === 0) continue;

    const { error } = await sb
      .from(table)
      .update({ tenant_id: tenant.id })
      .is("tenant_id", null);

    if (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${table}: ${count}件更新`);
      updated += count;
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`更新: ${updated}件 / エラー: ${errors}件`);
}

main().catch(console.error);
