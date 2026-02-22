const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pairs = [
  ["20251200348", "20260201121", "青木綾音"],
  ["20251200020", "20251200138", "青木友香"],
  ["20251200266", "20251200917", "佐藤由香"],
  ["20260200081", "20251200985", "佐藤"],
  ["20251200016", "20260200875", "渡辺江美"],
];

(async () => {
  console.log("旧PID\t旧氏名\t旧電話番号\t旧LINE UID\t旧orders\t新PID\t新氏名\t新電話番号\t新LINE UID\t新orders\t氏名一致\t電話一致\tUID一致");

  for (const [oldPid, newPid] of pairs) {
    const { data: oldP } = await supabase.from("patients").select("patient_id, name, tel, line_id").eq("patient_id", oldPid).maybeSingle();
    const { data: newP } = await supabase.from("patients").select("patient_id, name, tel, line_id").eq("patient_id", newPid).maybeSingle();

    if (!oldP || !newP) {
      console.log(oldPid + "\t(不明)\t-\t-\t-\t" + newPid + "\t(不明)\t-\t-\t-\t-\t-\t-");
      continue;
    }

    const { count: oldOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("patient_id", oldPid);
    const { count: newOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("patient_id", newPid);

    const nameOld = (oldP.name || "").replace(/\s+/g, "");
    const nameNew = (newP.name || "").replace(/\s+/g, "");
    const nameMatch = nameOld && nameNew && nameOld === nameNew ? "○" : "×";
    const telMatch = oldP.tel && newP.tel && oldP.tel === newP.tel ? "○" : "×";
    const uidMatch = oldP.line_id && newP.line_id && oldP.line_id === newP.line_id ? "○" : "×";

    console.log([
      oldPid,
      oldP.name || "(なし)",
      oldP.tel || "(なし)",
      oldP.line_id || "null",
      oldOrders || 0,
      newPid,
      newP.name || "(なし)",
      newP.tel || "(なし)",
      newP.line_id || "null",
      newOrders || 0,
      nameMatch,
      telMatch,
      uidMatch,
    ].join("\t"));
  }
})();
