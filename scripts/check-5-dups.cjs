require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = ["intake", "orders", "reservations", "reorders", "message_log",
  "patient_tags", "patient_marks", "friend_field_values",
  "coupon_issues", "nps_responses", "form_responses",
  "step_enrollments", "bank_transfer_orders", "chat_reads"];

const pairs = [
  ["20260101457", "LINE_3474b608", "石澤"],
  ["20260200131", "LINE_61b66c91", "萬條夕希"],
  ["20260101617", "LINE_4046fae4", "後藤淑乃"],
  ["20260101471", "20260101470", "松川未来"],
  ["20260200038", "20260200986", "深沼亜実"],
];

(async () => {
  for (const [pidA, pidB, name] of pairs) {
    console.log("=== " + name + " ===");
    const { data: pA } = await supabase.from("patients").select("*").eq("patient_id", pidA).maybeSingle();
    const { data: pB } = await supabase.from("patients").select("*").eq("patient_id", pidB).maybeSingle();

    for (const [label, p, pid] of [["A", pA, pidA], ["B", pB, pidB]]) {
      if (p) {
        console.log("  " + label + ": " + pid + " 氏名:" + (p.name || "(なし)") + " tel:" + (p.tel || "null") + " LINE:" + (p.line_id ? "あり" : "null") + " created:" + (p.created_at || "").slice(0, 10));
      } else {
        console.log("  " + label + ": " + pid + " → 患者レコードなし");
      }
    }

    // 各テーブルのデータ数
    const dataA = [];
    const dataB = [];
    for (const table of TABLES) {
      const { count: cA } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", pidA);
      const { count: cB } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", pidB);
      if (cA > 0) dataA.push(table + ":" + cA);
      if (cB > 0) dataB.push(table + ":" + cB);
    }
    console.log("  A データ: " + (dataA.length ? dataA.join(", ") : "なし"));
    console.log("  B データ: " + (dataB.length ? dataB.join(", ") : "なし"));
    console.log("");
  }
})();
