// LINE スクリーンショットに基づくメッセージログの最終修正
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

const PID_RISAKO = "20260200701";
const PID_HONOKA = "20260200905";
const DRY_RUN = process.argv.includes("--dry-run");

// りさこのトーク（スクリーンショット確認済み）
// 3469-3471: 友だち追加「りさこさま」
// 8322-8327: リッチメニュー 17:12
// 8331: 「16:45〜17:00の予約だったのですが」
// 8333: admin「不通」メッセージ
// 8340: 「こちらこそすみません。診察の方をお願いしたいです」
// 8341: 「電話番号が09094385169なのですが」← 現在ほのか側にある（誤）
// 9187: admin「このまま決済はお待ちいただけますでしょうか」← 現在ほのか側にある（誤）
// 9221: 「決済とは何でしょうか」← 現在ほのか側にある（誤）
// 9222: admin「同一端末で異なるラインアカウント」← 現在ほのか側にある（誤）
// 9223: 「していないと思います」← 現在ほのか側にある（誤）

// ほのかのトーク（スクリーンショット確認済み）
// 3472-3474: 友だち追加「ほのかさま」
// 3475-3483: 価格表リッチメニュー x3 ← 現在りさこ側にある（誤）
// 7400: 予約リマインド ← 現在りさこ側にある（誤）
// 8343-8348: リッチメニュー 17:22 ← 現在りさこ側にある（誤）
// 9040: 「マイページを開くと違う方のお名前が表示される」
// 9041: admin「スクリーンショットにてご共有」← 現在りさこ側にある（誤）
// 9042: スクリーンショット送信
// 9046: 「私は新家穂花なのですが」
// 9184: admin「原因を調査...メニュー変更」
// 9185: スクリーンショット
// 9186: 「まだ変わっていないのですが」

// 修正1: ほのか→りさこに戻す
const MOVE_TO_RISAKO = [8341, 9187, 9221, 9222, 9223];

// 修正2: りさこ→ほのかに移す
const MOVE_TO_HONOKA = [
  3475, 3476, 3477, 3478, 3479, 3480, 3481, 3482, 3483,  // 価格表
  7400,                                                      // 予約リマインド
  8343, 8344, 8345, 8346, 8347, 8348,                       // リッチメニュー 17:22
  9041,                                                      // admin「スクリーンショットにて」
];

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== 本番実行 ===");

  // 現在の状態を確認
  console.log("\n--- 修正前の件数 ---");
  const { count: c1 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", PID_RISAKO);
  const { count: c2 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", PID_HONOKA);
  console.log(`  りさこ (${PID_RISAKO}): ${c1}件`);
  console.log(`  ほのか (${PID_HONOKA}): ${c2}件`);

  // 修正対象の現在のPIDを確認
  console.log("\n--- 修正1: ほのか→りさこに戻す (5件) ---");
  for (const id of MOVE_TO_RISAKO) {
    const { data } = await sb.from("message_log").select("id, patient_id, content, sent_at").eq("id", id).maybeSingle();
    if (data) {
      console.log(`  id=${id} 現在PID=${data.patient_id} ${data.patient_id === PID_HONOKA ? "→ 移動対象" : "⚠️ 既にりさこ側"} | ${(data.content || "").slice(0, 40)}`);
    } else {
      console.log(`  id=${id} → 見つからない`);
    }
  }

  console.log("\n--- 修正2: りさこ→ほのかに移す (16件) ---");
  for (const id of MOVE_TO_HONOKA) {
    const { data } = await sb.from("message_log").select("id, patient_id, content, sent_at").eq("id", id).maybeSingle();
    if (data) {
      console.log(`  id=${id} 現在PID=${data.patient_id} ${data.patient_id === PID_RISAKO ? "→ 移動対象" : "⚠️ 既にほのか側"} | ${(data.content || "").slice(0, 40)}`);
    } else {
      console.log(`  id=${id} → 見つからない`);
    }
  }

  if (DRY_RUN) {
    console.log("\n=== DRY RUN 完了 ===");
    return;
  }

  // 実行
  console.log("\n--- 実行中 ---");

  // 修正1: ほのか→りさこ
  const { data: d1, error: e1 } = await sb.from("message_log")
    .update({ patient_id: PID_RISAKO })
    .eq("patient_id", PID_HONOKA)
    .in("id", MOVE_TO_RISAKO)
    .select("id");
  if (e1) console.error("  修正1エラー:", e1.message);
  else console.log(`  修正1: ${d1.length}件 → りさこ (${PID_RISAKO})`);

  // 修正2: りさこ→ほのか
  const { data: d2, error: e2 } = await sb.from("message_log")
    .update({ patient_id: PID_HONOKA })
    .eq("patient_id", PID_RISAKO)
    .in("id", MOVE_TO_HONOKA)
    .select("id");
  if (e2) console.error("  修正2エラー:", e2.message);
  else console.log(`  修正2: ${d2.length}件 → ほのか (${PID_HONOKA})`);

  // 修正後の件数
  console.log("\n--- 修正後の件数 ---");
  const { count: c3 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", PID_RISAKO);
  const { count: c4 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", PID_HONOKA);
  console.log(`  りさこ (${PID_RISAKO}): ${c1}件 → ${c3}件`);
  console.log(`  ほのか (${PID_HONOKA}): ${c2}件 → ${c4}件`);

  // 最終確認: りさこのトーク一覧
  console.log("\n--- りさこのトーク (修正後) ---");
  const { data: r1 } = await sb.from("message_log")
    .select("id, direction, event_type, message_type, content, sent_at")
    .eq("patient_id", PID_RISAKO)
    .order("sent_at", { ascending: true });
  if (r1) {
    for (const m of r1) {
      const d = new Date(m.sent_at);
      const jst = `${String(d.getUTCHours()+9).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
      console.log(`  ${d.toISOString().slice(0,10)} ${jst} | id=${m.id} | ${m.direction} ${m.event_type||m.message_type||""} | ${(m.content||"").slice(0, 50)}`);
    }
  }

  // 最終確認: ほのかのトーク一覧
  console.log("\n--- ほのかのトーク (修正後) ---");
  const { data: r2 } = await sb.from("message_log")
    .select("id, direction, event_type, message_type, content, sent_at")
    .eq("patient_id", PID_HONOKA)
    .order("sent_at", { ascending: true });
  if (r2) {
    for (const m of r2) {
      const d = new Date(m.sent_at);
      const jst = `${String(d.getUTCHours()+9).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
      console.log(`  ${d.toISOString().slice(0,10)} ${jst} | id=${m.id} | ${m.direction} ${m.event_type||m.message_type||""} | ${(m.content||"").slice(0, 50)}`);
    }
  }
}

main().catch(console.error);
