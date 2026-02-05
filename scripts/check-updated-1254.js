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
  // 12:50-13:00 JST = 03:50-04:00 UTC に更新された全予約
  console.log("=== 2/5 12:50-13:00 JST に更新された全予約 ===\n");

  const { data: updated } = await supabase
    .from("reservations")
    .select("*")
    .gte("updated_at", "2026-02-05T03:50:00+00:00")
    .lte("updated_at", "2026-02-05T04:00:00+00:00")
    .order("updated_at", { ascending: true });

  if (updated && updated.length > 0) {
    updated.forEach(r => {
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      const createdJST = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      console.log(`[${updatedJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id})`);
      console.log(`  予約: ${r.reserved_date} ${r.reserved_time}`);
      console.log(`  状態: ${r.status}`);
      console.log(`  作成: ${createdJST.toISOString().slice(0,16).replace("T"," ")} JST`);
      console.log("");
    });
    console.log(`合計: ${updated.length}件`);
  } else {
    console.log("(この時間帯に更新された予約なし)");
  }

  // 12:54前後（12:53-12:56）をピンポイントで確認
  console.log("\n=== 2/5 12:53-12:56 JST に更新された予約（ピンポイント） ===\n");

  const { data: pinpoint } = await supabase
    .from("reservations")
    .select("*")
    .gte("updated_at", "2026-02-05T03:53:00+00:00")
    .lte("updated_at", "2026-02-05T03:56:00+00:00")
    .order("updated_at", { ascending: true });

  if (pinpoint && pinpoint.length > 0) {
    pinpoint.forEach(r => {
      const updatedJST = new Date(new Date(r.updated_at).getTime() + 9*60*60*1000);
      console.log(`[${updatedJST.toISOString().slice(11,19)}] ${r.patient_name} (${r.patient_id}) → ${r.reserved_date} ${r.reserved_time} - ${r.status}`);
    });
  } else {
    console.log("(この時間帯に更新された予約なし)");
  }
}

main();
