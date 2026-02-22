// verify-rpc.cjs で誤って作成されたテストレコードの削除 + SEQUENCE修正
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. テストで作られた LINE_51637cf5 を削除
  console.log("=== テストレコード削除 ===");
  const { data: testRecord } = await sb
    .from("patients")
    .select("patient_id, line_id, created_at")
    .eq("patient_id", "LINE_51637cf5")
    .maybeSingle();

  if (testRecord) {
    // intake も削除
    await sb.from("intake").delete().eq("patient_id", "LINE_51637cf5");
    await sb.from("patients").delete().eq("patient_id", "LINE_51637cf5");
    console.log("  ✓ LINE_51637cf5 を削除しました");
  } else {
    console.log("  テストレコードなし（削除不要）");
  }

  // 2. 現在のMAX patient_id を確認（全数値IDの最大値）
  console.log("\n=== patient_id 最大値確認 ===");
  const { data: allPatients } = await sb
    .from("patients")
    .select("patient_id")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .order("patient_id", { ascending: false })
    .limit(20);

  let maxNumericId = 10000;
  if (allPatients) {
    for (const row of allPatients) {
      const num = Number(row.patient_id);
      if (!isNaN(num) && num > maxNumericId) {
        maxNumericId = num;
      }
    }
  }
  console.log("  最大数値ID:", maxNumericId);
  console.log("  次のID:", maxNumericId + 1);

  // 3. 重複確認
  console.log("\n=== 重複確認 ===");
  const { data: withLineId } = await sb
    .from("patients")
    .select("patient_id, line_id")
    .not("line_id", "is", null);

  if (withLineId) {
    const groups = {};
    for (const p of withLineId) {
      if (!groups[p.line_id]) groups[p.line_id] = [];
      groups[p.line_id].push(p.patient_id);
    }
    const dups = Object.entries(groups).filter(([, pids]) => pids.length > 1);
    console.log(`  重複 line_id: ${dups.length}件`);
    for (const [lid, pids] of dups) {
      console.log(`    ${lid.slice(-8)}: ${pids.join(", ")}`);
    }
  }

  console.log("\n=== 完了 ===");
}
main().catch(console.error);
