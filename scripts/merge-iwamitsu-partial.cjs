require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OLD_PID = "20251200554";
const NEW_PID = "20260200164";
const TABLES = ["reservations", "message_log"];

(async () => {
  const dryRun = !process.argv.includes("--exec");
  console.log(dryRun ? "=== DRY RUN ===" : "=== 実行モード ===");

  for (const table of TABLES) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", OLD_PID);
    console.log(table + ": " + count + "件を " + OLD_PID + " → " + NEW_PID + " に移行");

    if (!dryRun && count > 0) {
      const { error } = await supabase.from(table).update({ patient_id: NEW_PID }).eq("patient_id", OLD_PID);
      if (error) {
        console.log("  エラー: " + error.message);
      } else {
        console.log("  完了");
      }
    }
  }

  if (!dryRun) {
    // 移行後の確認
    console.log("\n=== 移行後確認 ===");
    for (const table of TABLES) {
      const { count: oldC } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", OLD_PID);
      const { count: newC } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", NEW_PID);
      console.log(table + ": 旧PID=" + oldC + "件, 新PID=" + newC + "件");
    }
  }
})();
