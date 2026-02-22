const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // patient_id = 20251200128 で patients テーブルを直接検索（line_id関係なく）
  const { data: p1, error: e1 } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_id", "20251200128");
  console.log("patients by patient_id:", p1, e1);

  // 全patients数
  const { count } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });
  console.log("\n全patients数:", count);

  // line_id が Ud3... のパターンを検索
  const { data: p2 } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .like("line_id", "%0781c9%");
  console.log("\npatients with line_id containing 0781c9:", p2);

  // 202512001 で始まるpatientをいくつか
  const { data: p3 } = await supabase
    .from("patients")
    .select("patient_id, patient_name, line_id, tenant_id")
    .like("patient_id", "2025120012%");
  console.log("\npatients with pid starting 2025120012:", p3);

  // answerers テーブルも確認
  const { data: a1 } = await supabase
    .from("answerers")
    .select("patient_id, name, line_uid")
    .like("patient_id", "20251200128%");
  console.log("\nanswerers for 20251200128:", a1);

  // webhook内部でどう解決されるかシミュレーション
  const lineUid = "Ud3b9239f681c04d0fe97ab72b60781c9";
  // tenantId = null のケース（LINE webhookの場合）
  const { data: findResult } = await supabase
    .from("patients")
    .select("patient_id, name")
    .eq("line_id", lineUid);
  console.log("\nfindPatientByLineUid result:", findResult);
}
main().catch(console.error);
