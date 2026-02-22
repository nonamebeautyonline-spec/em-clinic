const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // LINE_プレフィックス患者を全取得
  const { data: linePatients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .like("patient_id", "LINE_%");

  console.log("LINE_プレフィックス患者: " + linePatients.length + "件\n");

  // 正規patient_idの中でline_idが一致するものを探す
  let matches = [];
  let noMatches = [];

  for (const lp of linePatients) {
    if (!lp.line_id) {
      noMatches.push(lp);
      continue;
    }

    // 同じline_idを持つ正規患者を検索
    const { data: proper } = await sb
      .from("patients")
      .select("patient_id, name, line_id")
      .eq("line_id", lp.line_id)
      .not("patient_id", "like", "LINE_%");

    if (proper && proper.length > 0) {
      matches.push({
        line_pid: lp.patient_id,
        line_name: lp.name,
        proper_pid: proper[0].patient_id,
        proper_name: proper[0].name,
        line_uid: lp.line_id,
      });
    } else {
      noMatches.push(lp);
    }
  }

  console.log("=== マッチあり (line_idで正規患者と紐づく): " + matches.length + "件 ===");
  matches.forEach((m) =>
    console.log("  " + m.line_pid + " -> " + m.proper_pid + " (" + m.proper_name + ")")
  );

  console.log("\n=== マッチなし (正規患者が見つからない): " + noMatches.length + "件 ===");
  noMatches.forEach((m) =>
    console.log("  " + m.patient_id + " " + (m.name || "null") + " " + (m.line_id || "no-line-id"))
  );

  // LINE_患者の関連データ件数
  const lineIds = linePatients.map((p) => p.patient_id);

  const { count: orderCount } = await sb
    .from("orders")
    .select("patient_id", { count: "exact", head: true })
    .in("patient_id", lineIds);
  console.log("\n=== LINE_患者のorders: " + (orderCount || 0) + "件 ===");

  if (orderCount > 0) {
    const { data: orders } = await sb
      .from("orders")
      .select("patient_id, patient_name, status")
      .in("patient_id", lineIds);
    orders.forEach((o) => console.log("  " + o.patient_id + " " + o.patient_name + " " + o.status));
  }

  const { count: reorderCount } = await sb
    .from("reorders")
    .select("patient_id", { count: "exact", head: true })
    .in("patient_id", lineIds);
  console.log("=== LINE_患者のreorders: " + (reorderCount || 0) + "件 ===");

  const { count: intakeCount } = await sb
    .from("intake")
    .select("patient_id", { count: "exact", head: true })
    .in("patient_id", lineIds);
  console.log("=== LINE_患者のintake: " + (intakeCount || 0) + "件 ===");

  const { count: msgCount } = await sb
    .from("msglog")
    .select("patient_id", { count: "exact", head: true })
    .in("patient_id", lineIds);
  console.log("=== LINE_患者のmsglog: " + (msgCount || 0) + "件 ===");

  const { count: reservCount } = await sb
    .from("reservations")
    .select("patient_id", { count: "exact", head: true })
    .in("patient_id", lineIds);
  console.log("=== LINE_患者のreservations: " + (reservCount || 0) + "件 ===");
})();
