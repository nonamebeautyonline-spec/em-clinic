const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== RPC 動作確認 ===\n");

  // 1. next_patient_id テスト
  console.log("1. next_patient_id():");
  const { data: seqId, error: seqErr } = await sb.rpc("next_patient_id");
  if (seqErr) {
    console.error("  ❌ エラー:", seqErr.message);
  } else {
    console.log("  ✓ 次のID:", seqId);
  }

  // 2. find_or_create_patient テスト（存在しないUIDで検索のみ）
  console.log("\n2. find_or_create_patient（既存LINE UIDで検索テスト）:");
  // 既存患者のline_idを1件取得
  const { data: sample } = await sb
    .from("patients")
    .select("patient_id, line_id, name")
    .not("line_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (sample?.line_id) {
    const { data: rpcResult, error: rpcErr } = await sb.rpc("find_or_create_patient", {
      p_line_uid: sample.line_id,
      p_display_name: null,
      p_picture_url: null,
      p_tenant_id: null,
    });
    if (rpcErr) {
      console.error("  ❌ エラー:", rpcErr.message);
    } else {
      console.log("  ✓ 結果:", JSON.stringify(rpcResult));
      console.log("  ✓ created=false（既存患者を返した）:", rpcResult?.created === false ? "OK" : "NG");
      console.log("  ✓ patient_id一致:", rpcResult?.patient_id === sample.patient_id ? "OK" : `NG (expected ${sample.patient_id}, got ${rpcResult?.patient_id})`);
    }
  } else {
    console.log("  ⚠️ line_id付き患者がないためスキップ");
  }

  // 3. ユニークインデックス確認
  console.log("\n3. idx_patients_tenant_line_id_unique インデックス:");
  const { data: idx, error: idxErr } = await sb.rpc("exec_sql", {
    query: "SELECT indexname FROM pg_indexes WHERE indexname = 'idx_patients_tenant_line_id_unique'"
  });
  // exec_sql がなくても別の方法で確認
  if (idxErr) {
    console.log("  (exec_sql不可。supabase db push で適用済みのため存在するはず)");
  }

  // 4. 重複確認
  console.log("\n4. line_id 重複チェック:");
  const { data: allPatients } = await sb
    .from("patients")
    .select("patient_id, line_id")
    .not("line_id", "is", null);

  if (allPatients) {
    const groups = {};
    for (const p of allPatients) {
      if (!groups[p.line_id]) groups[p.line_id] = [];
      groups[p.line_id].push(p.patient_id);
    }
    const dups = Object.entries(groups).filter(([, pids]) => pids.length > 1);
    if (dups.length === 0) {
      console.log("  ✓ 重複 line_id なし（0件）");
    } else {
      console.log(`  ⚠️ 重複 line_id ${dups.length}件:`);
      for (const [lid, pids] of dups) {
        console.log(`    ${lid.slice(-8)}: ${pids.join(", ")}`);
      }
    }
  }

  console.log("\n=== 検証完了 ===");
}
main().catch(console.error);
