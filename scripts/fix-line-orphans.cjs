const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // message_log に残っている LINE_ patient_id を全て取得
  const { data: allLineLogs } = await sb
    .from("message_log")
    .select("patient_id, line_uid")
    .like("patient_id", "LINE\\_%")
    .limit(1000);

  // 重複排除
  const uniqueMap = new Map();
  for (const log of allLineLogs || []) {
    if (!uniqueMap.has(log.patient_id)) {
      uniqueMap.set(log.patient_id, log.line_uid);
    }
  }
  console.log("message_log に残る LINE_ patient_id:", uniqueMap.size, "件\n");

  for (const [fakeId, lineUid] of uniqueMap) {
    // 同じ line_uid を持つ正規患者がいるか
    const { data: proper } = await sb
      .from("patients")
      .select("patient_id, name")
      .eq("line_id", lineUid)
      .limit(10);

    const properPatient = (proper || []).find(
      (p) => !p.patient_id.startsWith("LINE_")
    );

    // LINE_ patients レコードがまだ残っているか
    const { data: fakePatient } = await sb
      .from("patients")
      .select("patient_id, name")
      .eq("patient_id", fakeId)
      .maybeSingle();

    const properName = properPatient
      ? `${properPatient.patient_id} (${properPatient.name})`
      : "なし";
    const fakeExists = fakePatient ? `あり (name=${fakePatient.name})` : "なし";

    // ログ件数
    const { data: logCount } = await sb
      .from("message_log")
      .select("id")
      .eq("patient_id", fakeId);

    console.log(
      `${fakeId} → 正規: ${properName} | patients残存: ${fakeExists} | ログ: ${logCount?.length || 0}件`
    );

    if (properPatient) {
      // 自動修復: message_log を正規PIDに付け替え
      const { data: migrated } = await sb
        .from("message_log")
        .update({ patient_id: properPatient.patient_id })
        .eq("patient_id", fakeId)
        .select("id");
      console.log(`  → message_log ${migrated?.length || 0}件を移行`);

      // patient_tags
      await sb
        .from("patient_tags")
        .update({ patient_id: properPatient.patient_id })
        .eq("patient_id", fakeId);

      // patient_marks
      await sb
        .from("patient_marks")
        .update({ patient_id: properPatient.patient_id })
        .eq("patient_id", fakeId);

      // friend_field_values
      await sb
        .from("friend_field_values")
        .update({ patient_id: properPatient.patient_id })
        .eq("patient_id", fakeId);

      // 仮 patients レコードが残っていたら削除
      if (fakePatient) {
        await sb.from("intake").delete().eq("patient_id", fakeId);
        await sb.from("patients").delete().eq("patient_id", fakeId);
        console.log(`  → 仮レコード削除完了`);
      }
    }
  }

  console.log("\n完了");
})();
