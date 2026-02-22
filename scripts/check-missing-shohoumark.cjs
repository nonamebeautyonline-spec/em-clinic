// 処方済み（orders有）でpatient_marksに red マーク（=処方ずみ）がない患者を調査
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1) ordersテーブルのpatient_id一覧（重複排除）
  const { data: orders, error: oErr } = await sb
    .from("orders")
    .select("patient_id");
  if (oErr) { console.error("orders error:", oErr); return; }

  const orderPids = [...new Set(orders.map(o => o.patient_id))];
  console.log("処方済み患者数（orders有）:", orderPids.length);

  // 2) patient_marksテーブルから red マーク（=処方ずみ）がある患者
  const { data: marks, error: mErr } = await sb
    .from("patient_marks")
    .select("patient_id, mark");
  if (mErr) { console.error("marks error:", mErr); return; }

  const redPids = new Set(marks.filter(m => m.mark === "red").map(m => m.patient_id));
  console.log("処方ずみマーク（red）付き患者数:", redPids.size);

  // 3) マークなしの処方済み患者
  const missing = orderPids.filter(pid => !redPids.has(pid));
  console.log("\n処方ずみマークなしの処方済み患者数:", missing.length);
  if (missing.length > 0 && missing.length <= 100) {
    console.log("対象PID:", missing);
  } else if (missing.length > 100) {
    console.log("対象PID（先頭20件）:", missing.slice(0, 20));
  }

  // 4) 逆：マークあり but orders なし
  const orderPidSet = new Set(orderPids);
  const redNoOrders = [...redPids].filter(pid => !orderPidSet.has(pid));
  console.log("\n処方ずみマークあり but orders なし:", redNoOrders.length);
  if (redNoOrders.length > 0 && redNoOrders.length <= 20) {
    console.log("対象PID:", redNoOrders);
  }
}

main().catch(console.error);
