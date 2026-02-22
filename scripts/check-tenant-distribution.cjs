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

async function main() {
  const tables = ["patients", "intake", "orders", "reservations", "message_log", "rich_menus", "admin_users", "tenant_settings", "products"];
  for (const table of tables) {
    const { count: total } = await sb.from(table).select("*", { count: "exact", head: true });
    const { count: withTenant } = await sb.from(table).select("*", { count: "exact", head: true }).not("tenant_id", "is", null);
    const { count: nullTenant } = await sb.from(table).select("*", { count: "exact", head: true }).is("tenant_id", null);
    console.log(`${table}: total=${total}, tenant_id設定済=${withTenant}, NULL=${nullTenant}`);
  }

  // tenant_id の実際の値を確認
  const { data: sample } = await sb.from("patients").select("tenant_id").not("tenant_id", "is", null).limit(1);
  console.log("\npatients の tenant_id 値サンプル:", sample?.[0]?.tenant_id);

  // テナント一覧
  const { data: tenants } = await sb.from("tenants").select("id, slug, name, is_active");
  console.log("\ntenants テーブル:");
  for (const t of tenants || []) {
    console.log(`  ${t.slug}: id=${t.id}, name=${t.name}, active=${t.is_active}`);
  }

  // admin_users の tenant_id を確認
  const { data: admins } = await sb.from("admin_users").select("username, tenant_id").limit(5);
  console.log("\nadmin_users:");
  for (const a of admins || []) {
    console.log(`  ${a.username}: tenant_id=${a.tenant_id}`);
  }
}

main().catch(console.error);
