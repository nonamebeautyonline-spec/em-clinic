const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 当日リマインド sent_log の tenant_id 確認
  const { data: logs } = await sb
    .from("reminder_sent_log")
    .select("id, rule_id, reservation_id, tenant_id, created_at")
    .eq("rule_id", 2)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("=== 当日リマインド sent_log 最新5件 ===");
  for (const l of (logs || [])) {
    console.log("  id:", l.id, "tenant_id:", l.tenant_id, "created_at:", l.created_at);
  }

  // ルール2の設定確認
  const { data: rule } = await sb
    .from("reminder_rules")
    .select("*")
    .eq("id", 2)
    .maybeSingle();
  console.log("\n=== ルール2 ===");
  console.log(JSON.stringify(rule, null, 2));

  // Vercelのログは見れないので、tenant_settingsのトークン確認
  const { data: settings } = await sb
    .from("tenant_settings")
    .select("tenant_id, category, key")
    .eq("category", "line")
    .eq("key", "channel_access_token");
  console.log("\n=== LINE token settings ===");
  for (const s of (settings || [])) {
    console.log("  tenant_id:", s.tenant_id);
  }

  // withTenantで sent_log をクエリした場合の結果確認
  // ルールのtenant_idでフィルタされた場合
  const ruleTid = rule ? rule.tenant_id : null;
  console.log("\nルールの tenant_id:", ruleTid);

  // reminder_sent_log のtenant_id分布
  const { data: allLogs } = await sb
    .from("reminder_sent_log")
    .select("tenant_id")
    .eq("rule_id", 2);
  const tidCount = {};
  for (const l of (allLogs || [])) {
    const k = l.tenant_id || "null";
    tidCount[k] = (tidCount[k] || 0) + 1;
  }
  console.log("sent_log tenant_id分布:", tidCount);

  // 前日リマインドのsent_log tenant_id分布
  const { data: allLogs1 } = await sb
    .from("reminder_sent_log")
    .select("tenant_id")
    .eq("rule_id", 1);
  const tidCount1 = {};
  for (const l of (allLogs1 || [])) {
    const k = l.tenant_id || "null";
    tidCount1[k] = (tidCount1[k] || 0) + 1;
  }
  console.log("前日sent_log tenant_id分布:", tidCount1);
})();
