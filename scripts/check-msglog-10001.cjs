require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: msgs } = await sb.from("message_log")
    .select("id, patient_id, line_uid, direction, content, sent_at")
    .eq("patient_id", "10001");

  // LINE UIDごとにグループ化
  const byLine = {};
  for (const m of msgs || []) {
    const k = m.line_uid || "unknown";
    if (!byLine[k]) byLine[k] = [];
    byLine[k].push(m);
  }

  console.log("=== LINE UIDごとのメッセージ数 ===");
  for (const [k, v] of Object.entries(byLine)) {
    console.log("  ", k.slice(0, 15), v.length, "件");
  }

  // 不明なLINE UIDを調査
  const mapping = {
    "U0bb53bea6753172d91cbe2ff5c19bbc0": "20260201025",
    "U5b3cbf251d95fb0257afc7a49898e158": "20260201026",
    "U8da206f7c3a66d458861fb5f526fd2f9": "20260201027",
    "Udd9d4b4980cd8d591c06cb0087f954c1": "20260201028",
  };

  for (const [lineUid, records] of Object.entries(byLine)) {
    if (!mapping[lineUid]) {
      console.log("\n=== 不明UID:", lineUid, "(", records.length, "件) ===");
      records.slice(0, 5).forEach(m =>
        console.log("  ", m.id, m.direction, m.content?.slice(0, 50), m.sent_at?.slice(0, 19))
      );

      // このUIDの answerers/intake を検索
      const { data: ans } = await sb.from("answerers")
        .select("patient_id, name, line_id").eq("line_id", lineUid);
      console.log("  answerers:", JSON.stringify(ans));

      const { data: intk } = await sb.from("intake")
        .select("id, patient_id, patient_name, line_id").eq("line_id", lineUid).limit(3);
      console.log("  intake:", JSON.stringify(intk));
    }
  }

  // 修復: message_log を正しいPIDに更新
  console.log("\n=== message_log 修復実行 ===");
  for (const [lineUid, records] of Object.entries(byLine)) {
    const newPid = mapping[lineUid];
    if (newPid) {
      const { error } = await sb.from("message_log")
        .update({ patient_id: newPid })
        .eq("patient_id", "10001")
        .eq("line_uid", lineUid);
      if (error) {
        console.log("  ERROR:", lineUid.slice(0, 12), error.message);
      } else {
        console.log("  ", lineUid.slice(0, 12), "→ PID", newPid, "(", records.length, "件)");
      }
    } else {
      // 不明なUIDはanswerers/intakeから正しいPIDを探す
      const { data: ans } = await sb.from("answerers")
        .select("patient_id").eq("line_id", lineUid).maybeSingle();
      if (ans) {
        const { error } = await sb.from("message_log")
          .update({ patient_id: ans.patient_id })
          .eq("patient_id", "10001")
          .eq("line_uid", lineUid);
        console.log("  ", lineUid.slice(0, 12), "→ PID", ans.patient_id, "(", records.length, "件)", error ? "ERROR:" + error.message : "");
      } else {
        console.log("  ", lineUid.slice(0, 12), "→ PID不明、手動対応必要 (", records.length, "件)");
      }
    }
  }

  // 残留確認
  const { count } = await sb.from("message_log")
    .select("*", { count: "exact", head: true }).eq("patient_id", "10001");
  console.log("\nmessage_log PID 10001 残留:", count, "件");
})();
