const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const tables = ["patients", "intake", "reservations", "orders", "reorders"];
  console.log("=== データ件数 ===");
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t}: ${count}件`);
  }
}
main().catch(console.error);
