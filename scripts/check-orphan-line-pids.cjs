const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const mergedPatients = [
  { newPid: "20260201075", name: "黒崎真由美" },
  { newPid: "20260200933", name: "古屋鋪優華" },
  { newPid: "20260201137", name: "目代遥" },
  { newPid: "20260201046", name: "木藤真理" },
  { newPid: "20260200784", name: "松岡はづき" },
  { newPid: "20260200593", name: "牧野七海" },
  { newPid: "20260200975", name: "内山春花" },
  { newPid: "LINE_d48f3e5b", name: "菅原美里" },
  { newPid: "235778694", name: "柿崎琉奈" },
  { newPid: "LINE_c2d98969", name: "鈴木結來" },
  { newPid: "LINE_38575fcc", name: "金沢由佳" },
  { newPid: "20260200875", name: "渡辺江美" },
];

const TABLES = ["intake", "orders", "reservations", "reorders", "message_log",
  "patient_tags", "patient_marks", "friend_field_values",
  "coupon_issues", "nps_responses", "form_responses",
  "step_enrollments", "bank_transfer_orders", "chat_reads"];

(async () => {
  let found = 0;

  for (const mp of mergedPatients) {
    const { data: p } = await supabase.from("patients").select("line_id").eq("patient_id", mp.newPid).maybeSingle();
    if (!p || !p.line_id) continue;

    const uid = p.line_id;
    const suffix = uid.slice(-8);
    const linePid = "LINE_" + suffix;

    if (mp.newPid === linePid) continue;

    let hasData = false;
    const dataInfo = [];
    for (const table of TABLES) {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("patient_id", linePid);
      if (count > 0) {
        hasData = true;
        dataInfo.push(table + ":" + count + "件");
      }
    }

    const { data: linePat } = await supabase.from("patients").select("patient_id, name").eq("patient_id", linePid).maybeSingle();

    if (hasData || linePat) {
      found++;
      console.log("⚠ " + mp.name + " (" + mp.newPid + ") → 孤立PID: " + linePid);
      if (linePat) console.log("  patients: 存在 (name: " + linePat.name + ")");
      if (dataInfo.length) console.log("  データ: " + dataInfo.join(", "));
      console.log("");
    }
  }

  if (found === 0) {
    console.log("孤立LINE_xxxPIDなし");
  } else {
    console.log("合計: " + found + "件の孤立PID");
  }
})();
