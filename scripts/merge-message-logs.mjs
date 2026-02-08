import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 削除した2つの仮ID → 本IDのマッピング
const MERGE_MAP = {
  "LINE_910b1622": "20260200592", // 平井千聖
  "LINE_ad7e84e0": "20260200580", // 土屋衣織
};

for (const [fakeId, realId] of Object.entries(MERGE_MAP)) {
  // message_logの件数確認
  const { count } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", fakeId);

  console.log(`${fakeId} → ${realId}: message_log ${count}件`);

  if (count > 0) {
    const { error } = await supabase
      .from("message_log")
      .update({ patient_id: realId })
      .eq("patient_id", fakeId);

    if (error) {
      console.log(`  FAIL: ${error.message}`);
    } else {
      console.log(`  OK: ${count}件を ${realId} に統合`);
    }
  }
}

console.log("\n完了");
