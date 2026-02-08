// 2/1-2/7の問診未完了患者のanswers内容を確認
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzfkgemtaxsrocbucmza.supabase.co";
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetPids = [
  "20260100110",  // 高橋優 2/1
  "20260100925",  // 中村 優菜 2/1
  "20260200197",  // 上田陽 2/4
  "20260200314",  // 山崎綾生 2/5
  "20260200346",  // 太刀川 椿姫 2/5
  "20260200444",  // 椛本 遥香 2/6
  "20260200453",  // 西角 亜祐 2/6
  "20260200458",  // 田中真樹 2/6
];

async function main() {
  console.log("=== 2/1-2/7 患者のanswers内容確認 ===\n");

  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answers, updated_at")
    .in("patient_id", targetPids);

  if (error) { console.error("Error:", error.message); return; }

  for (const p of data || []) {
    const ans = p.answers || {};
    const keys = Object.keys(ans);
    const hasNgCheck = typeof ans.ng_check === "string" && ans.ng_check !== "";
    const hasCurrentDisease = "current_disease_yesno" in ans;
    const hasMed = "med_yesno" in ans;
    const hasAllergy = "allergy_yesno" in ans;
    const hasEntry = "entry_route" in ans;

    console.log(`--- ${p.patient_name} (${p.patient_id}) ---`);
    console.log(`  updated_at: ${p.updated_at}`);
    console.log(`  answersキー数: ${keys.length}`);
    console.log(`  answersキー: ${keys.join(", ")}`);
    console.log(`  ng_check: ${hasNgCheck ? ans.ng_check : "(なし)"}`);
    console.log(`  問診項目: ng_check=${hasNgCheck}, current_disease=${hasCurrentDisease}, med=${hasMed}, allergy=${hasAllergy}, entry=${hasEntry}`);
    console.log();
  }
}

main().catch(console.error);
