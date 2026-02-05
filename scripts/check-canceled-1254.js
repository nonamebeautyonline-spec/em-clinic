const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"'\n]*)["']?$/);
  if (match) {
    process.env[match[1]] = match[2].trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 12:50-13:00 JST = 03:50-04:00 UTC にキャンセルされた予約
  console.log("=== 2/5 12:50-13:00 JST にキャンセルされた予約 ===\n");

  const { data: canceled } = await supabase
    .from("reservations")
    .select("*")
    .eq("status", "canceled")
    .gte("updated_at", "2026-02-05T03:50:00+00:00")
    .lte("updated_at", "2026-02-05T04:00:00+00:00")
    .order("updated_at", { ascending: true });

  if (canceled && canceled.length > 0) {
    canceled.forEach(r => {
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      console.log(`[${updatedJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id})`);
      console.log(`  予約: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`  作成: ${createdJST.toISOString().slice(0,16).replace("T"," ")} JST`);
      console.log(`  note: ${r.note || "(なし)"}`);
      console.log("");
    });
    console.log(`合計: ${canceled.length}件`);
  } else {
    console.log("(この時間帯にキャンセルされた予約なし)");
  }

  // 広めに 12:00-13:30 も確認
  console.log("\n=== 2/5 12:00-13:30 JST にキャンセルされた予約 ===\n");

  const { data: wider } = await supabase
    .from("reservations")
    .select("*")
    .eq("status", "canceled")
    .gte("updated_at", "2026-02-05T03:00:00+00:00")
    .lte("updated_at", "2026-02-05T04:30:00+00:00")
    .order("updated_at", { ascending: true });

  if (wider && wider.length > 0) {
    wider.forEach(r => {
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(`[${updatedJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id}) → ${r.reserved_date} ${r.reserved_time}`);
    });
    console.log(`\n合計: ${wider.length}件`);
  } else {
    console.log("(この時間帯にキャンセルされた予約なし)");
  }
}

main();
