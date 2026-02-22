import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const message = "予約フォーム・マイページに不具合がありましたが現在改善しております。\nご確認いただけますと幸いです。";

// 今入れたログを検索
const { data: logs } = await sb
  .from("message_log")
  .select("id, sent_at")
  .eq("content", message)
  .eq("direction", "outgoing");

console.log(`Found ${(logs || []).length} notification logs`);
if (logs && logs[0]) {
  console.log("Current sent_at:", logs[0].sent_at);
}

// 実際の送信時刻に修正（send-fix-notification.mjs の実行時刻）
// 下津佐つぐみのintake作成が 01:44:34 → 送信は約 01:45 UTC頃
const actualSentAt = "2026-02-09T01:45:00+00:00";

for (const log of logs || []) {
  await sb.from("message_log").update({ sent_at: actualSentAt }).eq("id", log.id);
}

console.log(`Updated ${(logs || []).length} entries to sent_at: ${actualSentAt}`);
