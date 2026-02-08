// 予約あり + 問診未完了の患者をリストアップ
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzfkgemtaxsrocbucmza.supabase.co";
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: reserved, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, answers, created_at, updated_at, status")
    .not("reserve_id", "is", null)
    .not("reserved_date", "is", null)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("=== 予約あり + 問診未完了の患者一覧 ===\n");

  const noQ = reserved.filter(r => {
    const ans = r.answers || {};
    const ngCheck = ans.ng_check;
    return typeof ngCheck !== "string" || ngCheck === "";
  });

  if (noQ.length === 0) {
    console.log("該当なし");
    return;
  }

  console.log("予約取得日 | patient_id | 氏名 | 予約日 | 予約時間 | status");
  console.log("-".repeat(100));
  for (const p of noQ) {
    const booked = p.updated_at ? p.updated_at.replace("T", " ").slice(0, 16) : "";
    const cols = [
      booked,
      p.patient_id,
      p.patient_name || "(名前なし)",
      p.reserved_date,
      p.reserved_time || "",
      p.status || "",
    ];
    console.log(cols.join(" | "));
  }
  console.log("\n合計: " + noQ.length + "人");
}

main().catch(console.error);
