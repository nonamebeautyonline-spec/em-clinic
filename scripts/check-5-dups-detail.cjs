require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

    // intake
    const { data: intA } = await supabase.from("intake").select("id, patient_id, reserve_id, status, created_at").eq("patient_id", pidA);
    const { data: intB } = await supabase.from("intake").select("id, patient_id, reserve_id, status, created_at").eq("patient_id", pidB);

    console.log("  [intake]");
    for (const i of (intA || [])) {
      console.log("    A " + pidA + ": id=" + i.id + " reserve_id=" + (i.reserve_id || "null") + " status=" + (i.status || "null") + " created=" + (i.created_at || "").slice(0, 10));
    }
    for (const i of (intB || [])) {
      console.log("    B " + pidB + ": id=" + i.id + " reserve_id=" + (i.reserve_id || "null") + " status=" + (i.status || "null") + " created=" + (i.created_at || "").slice(0, 10));
    }

    // reservations
    const { data: resA } = await supabase.from("reservations").select("reserve_id, patient_id, reserved_date, status, menu_name").eq("patient_id", pidA);
    const { data: resB } = await supabase.from("reservations").select("reserve_id, patient_id, reserved_date, status, menu_name").eq("patient_id", pidB);

    console.log("  [reservations]");
    if (!resA?.length && !resB?.length) {
      console.log("    なし");
    }
    for (const r of (resA || [])) {
      console.log("    A " + pidA + ": " + r.reserve_id + " " + r.reserved_date + " status=" + (r.status || "null") + " " + (r.menu_name || ""));
    }
    for (const r of (resB || [])) {
      console.log("    B " + pidB + ": " + r.reserve_id + " " + r.reserved_date + " status=" + (r.status || "null") + " " + (r.menu_name || ""));
    }

    // orders
    const { data: ordA } = await supabase.from("orders").select("id, patient_id, status, created_at").eq("patient_id", pidA);
    const { data: ordB } = await supabase.from("orders").select("id, patient_id, status, created_at").eq("patient_id", pidB);

    if (ordA?.length || ordB?.length) {
      console.log("  [orders]");
      for (const o of (ordA || [])) {
        console.log("    A " + pidA + ": id=" + o.id + " status=" + (o.status || "null") + " created=" + (o.created_at || "").slice(0, 10));
      }
      for (const o of (ordB || [])) {
        console.log("    B " + pidB + ": id=" + o.id + " status=" + (o.status || "null") + " created=" + (o.created_at || "").slice(0, 10));
      }
    }
    console.log("");
  }
})();
