const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== 最終検証 ===\n");

  // 1. next_patient_id が正しい値を返すか
  const { data: seqId, error: seqErr } = await sb.rpc("next_patient_id");
  console.log("1. next_patient_id():", seqErr ? `❌ ${seqErr.message}` : `✓ ${seqId}`);

  // 2. find_or_create_patient（既存患者の tenant_id を使って検索）
  const { data: sample } = await sb
    .from("patients")
    .select("patient_id, line_id, tenant_id")
    .not("line_id", "is", null)
    .not("patient_id", "like", "LINE_%")
    .limit(1)
    .maybeSingle();

  if (sample?.line_id) {
    const { data: rpcResult, error: rpcErr } = await sb.rpc("find_or_create_patient", {
      p_line_uid: sample.line_id,
      p_display_name: null,
      p_picture_url: null,
      p_tenant_id: sample.tenant_id,
    });
    if (rpcErr) {
      console.log("2. find_or_create_patient:", `❌ ${rpcErr.message}`);
    } else {
      const found = rpcResult?.created === false && rpcResult?.patient_id === sample.patient_id;
      console.log(`2. find_or_create_patient: ${found ? "✓" : "❌"} patient_id=${rpcResult?.patient_id}, created=${rpcResult?.created}`);
    }
  }

  // 3. 重複確認
  const { data: withLineId } = await sb
    .from("patients")
    .select("patient_id, line_id")
    .not("line_id", "is", null);

  const groups = {};
  for (const p of (withLineId || [])) {
    if (!groups[p.line_id]) groups[p.line_id] = [];
    groups[p.line_id].push(p.patient_id);
  }
  const dups = Object.entries(groups).filter(([, pids]) => pids.length > 1);
  console.log(`3. line_id 重複: ${dups.length === 0 ? "✓ 0件" : `❌ ${dups.length}件`}`);

  // 4. データ件数
  const tables = ["patients", "intake", "reservations", "orders", "reorders"];
  console.log("\n4. データ件数:");
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(`   ${t}: ${count}件`);
  }

  console.log("\n=== 完了 ===");
}
main().catch(console.error);
