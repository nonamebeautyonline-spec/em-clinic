import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const IDS = [
  "20260200565","20260200568","20260200570","20260200572",
  "20260200576","20260200577","20260200580","20260200581",
  "20260200582","20260200583","20260200585","20260200588",
  "20260200591","20260200592",
];

// 1. 14人のline_idをanswersから取得
const { data: answerers } = await supabase
  .from("answerers")
  .select("patient_id, line_id, name")
  .in("patient_id", IDS);

console.log("=== 14人のline_id状況 ===\n");

let restored = 0;
let deleted = 0;

for (const pid of IDS) {
  const a = answerers.find(x => x.patient_id === pid);
  const lineId = a ? a.line_id : null;

  // intake.line_idを確認
  const { data: intake } = await supabase
    .from("intake")
    .select("line_id, patient_name")
    .eq("patient_id", pid)
    .single();

  const name = intake?.patient_name || "(空)";

  // line_idがnullなら復元
  if (lineId && !intake?.line_id) {
    const { error } = await supabase
      .from("intake")
      .update({ line_id: lineId })
      .eq("patient_id", pid);
    if (error) {
      console.log(`FAIL ${pid} ${name} — line_id復元失敗: ${error.message}`);
    } else {
      console.log(`RESTORE ${pid} ${name} → ${lineId}`);
      restored++;
    }
  } else if (intake?.line_id) {
    console.log(`OK      ${pid} ${name} — line_id既にあり: ${intake.line_id}`);
  } else {
    console.log(`SKIP    ${pid} ${name} — answersにもline_idなし`);
  }

  // 同じline_idを持つLINE_仮レコードを検索して削除
  if (lineId) {
    const { data: fakeRecords } = await supabase
      .from("intake")
      .select("patient_id, patient_name")
      .eq("line_id", lineId)
      .like("patient_id", "LINE_%");

    for (const fake of (fakeRecords || [])) {
      const { error } = await supabase
        .from("intake")
        .delete()
        .eq("patient_id", fake.patient_id);
      if (error) {
        console.log(`  DEL FAIL ${fake.patient_id} (${fake.patient_name}): ${error.message}`);
      } else {
        console.log(`  DEL OK   ${fake.patient_id} (${fake.patient_name})`);
        deleted++;
      }
    }
  }
}

console.log(`\n=== 完了: line_id復元 ${restored}件 / 仮レコード削除 ${deleted}件 ===`);
