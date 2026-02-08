import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

const REAL_PID = "20260200592";
const LINE_UID = "Ua0065c7540a779b75bedf3d9910b1622";

// 1. intake.line_id を復元
const { error: e1 } = await supabase
  .from("intake")
  .update({ line_id: LINE_UID })
  .eq("patient_id", REAL_PID);

if (e1) { console.error("intake update failed:", e1); process.exit(1); }
console.log("OK: intake.line_id を復元 →", LINE_UID);

// 2. 仮IDのintakeレコードを確認・削除
// LINE_910b1622 → UIDの末尾8桁から仮IDを推定
const { data: fakeRecords } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .eq("line_id", LINE_UID)
  .like("patient_id", "LINE_%");

if (fakeRecords && fakeRecords.length > 0) {
  for (const r of fakeRecords) {
    console.log(`仮レコード発見: ${r.patient_id} | ${r.patient_name}`);
    const { error } = await supabase
      .from("intake")
      .delete()
      .eq("patient_id", r.patient_id);
    if (error) {
      console.error(`仮レコード削除失敗: ${r.patient_id}`, error);
    } else {
      console.log(`OK: 仮レコード ${r.patient_id} を削除`);
    }
  }
} else {
  console.log("仮IDのintakeレコードは見つかりませんでした（別のline_idかも）");
  // LINE_で始まるpatient_idを直接検索
  const { data: lineRecords } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .like("patient_id", "LINE_%")
    .ilike("patient_name", "%千聖%");
  if (lineRecords && lineRecords.length > 0) {
    for (const r of lineRecords) {
      console.log(`名前一致の仮レコード: ${r.patient_id} | ${r.patient_name} | ${r.line_id}`);
    }
  }
}

// 3. 確認
const { data: check } = await supabase
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .eq("patient_id", REAL_PID)
  .single();
console.log("\n=== 復元結果 ===");
console.log(check);
