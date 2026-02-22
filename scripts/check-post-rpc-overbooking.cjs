// RPC導入(2/12 17:15)後に3件以上入った予約スロットと
// そのうちキャンセルされたものがないか調査
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RPC_DEPLOY = new Date("2026-02-12T17:15:00+09:00");

(async () => {
  // RPC導入後に作成された全予約を取得
  const { data: resvs, error } = await sb.from("reservations")
    .select("reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, created_at, updated_at")
    .gte("created_at", RPC_DEPLOY.toISOString())
    .order("reserved_date")
    .order("reserved_time")
    .order("created_at");

  if (error) { console.error("エラー:", error.message); return; }
  console.log("RPC導入後の予約数: " + resvs.length + "件\n");

  // スロット別にグループ化
  const slots = {};
  for (const r of resvs) {
    const key = r.reserved_date + " " + r.reserved_time;
    if (!slots[key]) slots[key] = [];
    slots[key].push(r);
  }

  // 3件以上のスロット
  let found = false;
  for (const [slot, list] of Object.entries(slots)) {
    if (list.length >= 3) {
      found = true;
      const active = list.filter(r => r.status !== "canceled");
      const canceled = list.filter(r => r.status === "canceled");
      console.log("=== " + slot + " (" + list.length + "件, アクティブ" + active.length + "/キャンセル" + canceled.length + ") ===");
      for (const r of list) {
        const mark = r.status === "canceled" ? "❌" : "✅";
        console.log("  " + mark + " " + r.patient_id + " " + (r.patient_name || "") + " status=" + r.status + " created=" + r.created_at);
      }
      console.log("");
    }
  }

  // キャンセルされた予約で、同一スロットにアクティブが2件以上あるもの（オーバーブッキングでキャンセルされた疑い）
  console.log("=== キャンセル予約の詳細分析 ===");
  const canceledAfterRpc = resvs.filter(r => r.status === "canceled");
  console.log("RPC導入後にキャンセルされた予約: " + canceledAfterRpc.length + "件");

  // 全予約（RPC前も含む）でスロット確認
  for (const c of canceledAfterRpc) {
    const { data: slotAll } = await sb.from("reservations")
      .select("reserve_id, patient_id, patient_name, status, created_at")
      .eq("reserved_date", c.reserved_date)
      .eq("reserved_time", c.reserved_time);

    const activeInSlot = (slotAll || []).filter(r => r.status !== "canceled");
    if (activeInSlot.length >= 2) {
      console.log("\n  " + c.patient_id + " " + (c.patient_name || "") + " " + c.reserved_date + " " + c.reserved_time);
      console.log("    キャンセル日時: " + c.updated_at);
      console.log("    同スロットのアクティブ予約: " + activeInSlot.length + "件");
    }
  }

  if (!found) {
    console.log("\nRPC導入後に3件以上予約が入ったスロットはありません。");
  }
})();
