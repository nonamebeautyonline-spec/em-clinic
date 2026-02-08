// 上田陽の詳細確認
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);
const GAS_URL = process.env.GAS_MYPAGE_URL;
const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL || process.env.GAS_INTAKE_LIST_URL;
const pid = "20260200197";

async function main() {
  console.log("=== 上田陽 (20260200197) 詳細確認 ===\n");

  // DB
  const { data } = await supabase.from("intake").select("*").eq("patient_id", pid).maybeSingle();
  if (data) {
    console.log("[DB] status:", data.status);
    console.log("[DB] reserve_id:", data.reserve_id);
    console.log("[DB] reserved_date:", data.reserved_date);
    console.log("[DB] answersキー:", Object.keys(data.answers || {}));
    console.log("[DB] ng_check:", data.answers?.ng_check || "(なし)");
  } else {
    console.log("[DB] レコードなし");
  }

  // GAS Dashboard
  console.log("\n--- GAS Dashboard ---");
  try {
    const res = await fetch(`${GAS_URL}?type=getDashboard&patient_id=${pid}&light=1`);
    const json = await res.json();
    console.log("[GAS] hasIntake:", json.hasIntake);
    console.log("[GAS] intakeId:", json.intakeId);
    console.log("[GAS] patient:", JSON.stringify(json.patient, null, 2));
  } catch (e) {
    console.log("[GAS] Error:", e.message);
  }

  // GAS Intake List で該当患者を探す
  if (GAS_INTAKE_URL) {
    console.log("\n--- GAS Intake List ---");
    try {
      const res = await fetch(GAS_INTAKE_URL, { method: "GET", redirect: "follow" });
      const json = await res.json();
      const rows = json.rows || json || [];
      const match = rows.filter(r => String(r.patient_id || "").trim() === pid);
      if (match.length > 0) {
        console.log("[GAS Intake] 見つかった:", match.length, "件");
        for (const r of match) {
          console.log("  キー:", Object.keys(r).join(", "));
          console.log("  ng_check:", r.ng_check || "(なし)");
        }
      } else {
        console.log("[GAS Intake] 該当なし（問診シートにデータなし）");
      }
    } catch (e) {
      console.log("[GAS Intake] Error:", e.message);
    }
  }
}

main().catch(console.error);
