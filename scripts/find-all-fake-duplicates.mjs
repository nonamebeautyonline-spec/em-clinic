import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 14人のline_id一覧
const TARGET_UIDS = [
  "Ud7b3612cf826bf0a80ccec18f3d82601",
  "Ub0b6b520b4f9ca68bebcd633bbedc731",
  "Uc394d7f68650ae8456b37f131e8054e6",
  "U92b9bad9802a71ece1579d830e284fb0",
  "U798d662b5deaf72cc368085cb134fd6b",
  "U11d0a4644641d32ca42e61a9e4a1b8e1",
  "U41672153fe3b7b0ee7260ee9ad7e84e0",
  "U273e0d717f69d1d4b35454a00f3f63c7",
  "U926cb0ba8062dcfbb342d07482921c47",
  "U44d2e6cea1d11c6baf2a7ba06e8248a0",
  "U69e57ac3a054640df170d9c82e6d6df3",
  "Uce068ce8b1547c81e00b2f18596b92bf",
  "U729087c5dbfbe4b6d3d5df350ebe5667",
  "Ua0065c7540a779b75bedf3d9910b1622",
];

// 全LINE_レコードを取得
const { data: lineRecords } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .like("patient_id", "LINE_%");

console.log(`LINE_レコード総数: ${lineRecords.length}\n`);

// line_idが14人のいずれかと一致するLINE_レコードを検索
console.log("=== 14人と同じline_idを持つLINE_仮レコード ===");
let found = 0;
for (const r of lineRecords) {
  if (r.line_id && TARGET_UIDS.includes(r.line_id)) {
    console.log(`${r.patient_id} | ${r.patient_name} | ${r.line_id}`);
    found++;
  }
}
if (found === 0) console.log("なし");

// line_idがnullのLINE_レコードで、patient_nameが14人と一致するものを検索
const { data: realRecords } = await supabase
  .from("intake")
  .select("patient_id, patient_name")
  .in("patient_id", [
    "20260200565","20260200568","20260200570","20260200572",
    "20260200576","20260200577","20260200580","20260200581",
    "20260200582","20260200583","20260200585","20260200588",
    "20260200591","20260200592",
  ]);

// LINE_レコードでline_idがnullのもの → LINE表示名で突き合わせはできないが、
// message_logにpatient_idとして記録されているかチェック
console.log("\n=== LINE_レコード（line_id=null）で14人のUIDとmessage_logで一致 ===");
const nullLineRecords = lineRecords.filter(r => !r.line_id);
console.log(`line_id=nullのLINE_レコード: ${nullLineRecords.length}件`);

// message_logからLINE_レコードのline_uidを取得
let foundByMsg = 0;
for (const r of nullLineRecords) {
  const { data: msgs } = await supabase
    .from("message_log")
    .select("line_uid")
    .eq("patient_id", r.patient_id)
    .limit(1);

  if (msgs && msgs.length > 0 && msgs[0].line_uid && TARGET_UIDS.includes(msgs[0].line_uid)) {
    console.log(`${r.patient_id} | ${r.patient_name} | msg line_uid: ${msgs[0].line_uid}`);
    foundByMsg++;
  }
}
if (foundByMsg === 0) console.log("なし");

console.log(`\n=== 合計: line_id一致 ${found}件 + message_log一致 ${foundByMsg}件 ===`);
