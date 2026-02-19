// scripts/fix-reservation-tenant-id.cjs
// RPCで作成されたtenant_id=NULLの予約にtenant_idをバックフィル
// 使い方: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-reservation-tenant-id.cjs

const { createClient } = require("@supabase/supabase-js");

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // tenant_id=NULLの予約を確認
  const { data: nullRows, error: countErr } = await sb
    .from("reservations")
    .select("id, reserve_id, patient_name, reserved_date, reserved_time, status")
    .is("tenant_id", null);

  if (countErr) {
    console.error("取得エラー:", countErr);
    process.exit(1);
  }

  if (!nullRows || nullRows.length === 0) {
    console.log("tenant_id=NULLの予約なし");
    return;
  }

  console.log(`${nullRows.length}件のtenant_id=NULL予約を修正します:`);
  for (const r of nullRows) {
    console.log(`  ${r.reserved_date} ${r.reserved_time} ${r.patient_name} (${r.status})`);
  }

  // 一括更新
  const ids = nullRows.map(r => r.id);
  const { error: updateErr } = await sb
    .from("reservations")
    .update({ tenant_id: TENANT_ID })
    .in("id", ids);

  if (updateErr) {
    console.error("更新エラー:", updateErr);
    process.exit(1);
  }

  console.log(`${nullRows.length}件を tenant_id=${TENANT_ID} に更新完了`);
}

main().catch(console.error);
