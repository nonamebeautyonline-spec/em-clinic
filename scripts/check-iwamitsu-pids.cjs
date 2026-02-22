require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 両方のPIDのLINE UIDを確認
  const { data: p1 } = await supabase.from("patients").select("*").eq("patient_id", "20251200554").maybeSingle();
  const { data: p2 } = await supabase.from("patients").select("*").eq("patient_id", "20260200164").maybeSingle();

  console.log("=== 20251200554 ===");
  console.log(JSON.stringify(p1, null, 2));
  console.log("\n=== 20260200164 ===");
  console.log(JSON.stringify(p2, null, 2));

  // LINE UIDからLINE_xxxPIDを導出
  if (p1 && p1.line_id) {
    const suffix = p1.line_id.slice(-8);
    const linePid = "LINE_" + suffix;
    console.log("\n旧PIDのLINE_xxx:", linePid);
    const { data: lp } = await supabase.from("patients").select("patient_id, name").eq("patient_id", linePid).maybeSingle();
    if (lp) console.log("  患者レコード: 存在", lp.name);
    else console.log("  患者レコード: なし");
  }

  if (p2 && p2.line_id) {
    const suffix = p2.line_id.slice(-8);
    const linePid = "LINE_" + suffix;
    console.log("\n新PIDのLINE_xxx:", linePid);
    const { data: lp } = await supabase.from("patients").select("patient_id, name").eq("patient_id", linePid).maybeSingle();
    if (lp) console.log("  患者レコード: 存在", lp.name);
    else console.log("  患者レコード: なし");
  }

  // answerers も確認（統合元の手がかり）
  console.log("\n=== answerers確認 ===");
  const { data: a1 } = await supabase.from("answerers").select("patient_id, name, answerer_id").eq("patient_id", "20251200554").maybeSingle();
  const { data: a2 } = await supabase.from("answerers").select("patient_id, name, answerer_id").eq("patient_id", "20260200164").maybeSingle();
  console.log("20251200554:", a1 ? a1.name + " (answerer_id: " + a1.answerer_id + ")" : "なし");
  console.log("20260200164:", a2 ? a2.name + " (answerer_id: " + a2.answerer_id + ")" : "なし");

  // 全テーブルでデータ量を確認
  const TABLES = ["intake", "orders", "reservations", "reorders", "message_log",
    "patient_tags", "patient_marks", "friend_field_values",
    "coupon_issues", "nps_responses", "form_responses",
    "step_enrollments", "bank_transfer_orders", "chat_reads"];

  console.log("\n=== 各テーブルのデータ数 ===");
  console.log("テーブル\t20251200554\t20260200164");
  for (const table of TABLES) {
    const { count: c1 } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", "20251200554");
    const { count: c2 } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", "20260200164");
    if (c1 > 0 || c2 > 0) {
      console.log(table + "\t" + c1 + "\t" + c2);
    }
  }

  // 管理画面の統合ログ（audit_logs）を確認
  console.log("\n=== 統合の監査ログ ===");
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .or("details->>old_patient_id.eq.20251200554,details->>new_patient_id.eq.20251200554,details->>old_patient_id.eq.20260200164,details->>new_patient_id.eq.20260200164")
    .limit(10);

  if (logs && logs.length > 0) {
    for (const l of logs) {
      console.log(l.action, JSON.stringify(l.details));
    }
  } else {
    console.log("統合ログなし（監査ログ実装前に統合された可能性）");
  }
})();
