// 未診察 + 予約済み + 問診未完了の患者一覧（LINE一斉配信用）
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id, reserve_id, reserved_date, reserved_time, answers, status")
    .not("reserve_id", "is", null)
    .not("reserved_date", "is", null)
    .order("reserved_date", { ascending: true })
    .order("reserved_time", { ascending: true });

  if (error) { console.error("Error:", error.message); return; }

  const targets = data.filter(r => {
    // status=OKは診察完了済みなので除外
    if (r.status === "OK" || r.status === "NG") return false;
    // 問診未完了
    const ans = r.answers || {};
    return typeof ans.ng_check !== "string" || ans.ng_check === "";
  });

  const withLine = targets.filter(t => t.line_id);
  const noLine = targets.filter(t => !t.line_id);

  console.log("=== 未診察 + 予約済み + 問診未完了 ===\n");
  console.log(`合計: ${targets.length}人 (LINE連携あり: ${withLine.length}人, なし: ${noLine.length}人)\n`);

  console.log("--- LINE連携あり（配信対象） ---");
  console.log("patient_id | 氏名 | 予約日 | 予約時間 | line_id");
  console.log("-".repeat(110));
  for (const p of withLine) {
    console.log([p.patient_id, p.patient_name || "", p.reserved_date, p.reserved_time || "", p.line_id].join(" | "));
  }

  if (noLine.length > 0) {
    console.log("\n--- LINE未連携（配信不可） ---");
    for (const p of noLine) {
      console.log([p.patient_id, p.patient_name || "", p.reserved_date, p.reserved_time || ""].join(" | "));
    }
  }
}

main().catch(console.error);
