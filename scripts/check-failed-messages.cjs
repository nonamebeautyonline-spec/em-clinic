const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"'\r]*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 送信失敗メッセージ
  const { data, error } = await supabase
    .from("message_log")
    .select("id, patient_id, line_uid, direction, event_type, message_type, status, error_message, content, sent_at")
    .eq("direction", "outgoing")
    .eq("status", "failed")
    .gte("sent_at", threeDaysAgo)
    .order("sent_at", { ascending: false })
    .limit(30);

  if (error) { console.error("Error:", error); process.exit(1); }

  console.log(`=== 送信失敗メッセージ (直近3日): ${data.length}件 ===\n`);
  for (const row of data) {
    console.log(`[${row.sent_at}] ${row.message_type} | patient=${row.patient_id}`);
    console.log(`  content: ${(row.content || "").substring(0, 120)}`);
    console.log(`  error: ${row.error_message || "(なし)"}`);
    console.log(`  line_uid: ${row.line_uid}`);
    console.log();
  }

  // ステータス分布
  const { data: stats } = await supabase
    .from("message_log")
    .select("status, message_type")
    .eq("direction", "outgoing")
    .gte("sent_at", threeDaysAgo);

  if (stats) {
    const counts = {};
    for (const s of stats) {
      const key = `${s.status}|${s.message_type}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    console.log("=== ステータス分布 (直近3日, outgoing) ===");
    for (const [key, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${key}: ${count}`);
    }
  }
})();
