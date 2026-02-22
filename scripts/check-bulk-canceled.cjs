require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 2026-02-14以降のcanceled予約を全取得
  const { data: canceled, error } = await sb.from("reservations")
    .select("reserve_id, patient_id, reserved_date, reserved_time, status, updated_at, created_at")
    .eq("status", "canceled")
    .gte("reserved_date", "2026-02-14")
    .order("reserved_date", { ascending: true })
    .order("reserved_time", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("=== 2/14以降のcanceled予約: " + (canceled || []).length + "件 ===\n");

  if (!canceled || canceled.length === 0) {
    console.log("なし");
    return;
  }

  // 日付+時間でグルーピング
  const bySlot = {};
  for (const r of canceled) {
    const key = r.reserved_date + " " + r.reserved_time;
    if (!bySlot[key]) bySlot[key] = [];
    bySlot[key].push(r);
  }

  // updated_atでグルーピング（同時刻キャンセル検出）
  const byUpdated = {};
  for (const r of canceled) {
    const upd = r.updated_at ? r.updated_at.slice(0, 16) : "unknown";
    if (!byUpdated[upd]) byUpdated[upd] = [];
    byUpdated[upd].push(r);
  }

  // 全件表示
  console.log("--- 全canceled予約一覧 ---");
  for (const r of canceled) {
    console.log("  " + r.reserved_date + " " + r.reserved_time + " pid=" + r.patient_id + " updated=" + r.updated_at);
  }

  // 同一スロット（日付+時間）に複数キャンセルがあるか
  console.log("\n--- 同一スロットに複数キャンセル ---");
  let found = false;
  for (const [slot, items] of Object.entries(bySlot)) {
    if (items.length >= 2) {
      found = true;
      console.log("  " + slot + " : " + items.length + "件");
      for (const r of items) {
        console.log("    pid=" + r.patient_id + " updated=" + r.updated_at);
      }
    }
  }
  if (!found) console.log("  なし");

  // 同一updated_at（分単位）に複数キャンセルがあるか
  console.log("\n--- 同一時刻（分単位）にキャンセルされたもの ---");
  let found2 = false;
  for (const [upd, items] of Object.entries(byUpdated)) {
    if (items.length >= 2) {
      found2 = true;
      console.log("  updated_at=" + upd + " : " + items.length + "件");
      for (const r of items) {
        console.log("    " + r.reserved_date + " " + r.reserved_time + " pid=" + r.patient_id);
      }
    }
  }
  if (!found2) console.log("  なし");
})();
