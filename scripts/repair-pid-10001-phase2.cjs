// PID 10001 修復 Phase 2: データ消失患者の復元 + message_log 残留修復
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Phase 1 で修復済みの4人
const KNOWN_MAPPING = {
  "U0bb53bea6753172d91cbe2ff5c19bbc0": "20260201025", // 安田乃愛
  "U5b3cbf251d95fb0257afc7a49898e158": "20260201026", // 玉田楓花
  "U8da206f7c3a66d458861fb5f526fd2f9": "20260201027", // 加藤日菜子
  "Udd9d4b4980cd8d591c06cb0087f954c1": "20260201028", // 渡邉裕大
};

// データ消失患者（message_log のみ残存）
const LOST_PATIENTS = [
  {
    lineId: "U00ff3d841638e263e12695f9a4b466ed",
    name: "不明（予約確定2/21 18:00受信者）", // 原田春陽の可能性
  },
  {
    lineId: "Ub281195a00397e12a74c18e8f430f2b1",
    name: "三谷彩加",
  },
];

async function main() {
  console.log("=== PID 10001 Phase 2 修復 ===\n");

  // 現在の最大PIDを取得
  const { data: maxRow } = await sb
    .from("answerers")
    .select("patient_id")
    .not("patient_id", "like", "LINE_%")
    .not("patient_id", "like", "TEST_%")
    .order("patient_id", { ascending: false })
    .limit(10);

  let maxNumericId = 10000;
  for (const row of maxRow || []) {
    const num = Number(row.patient_id);
    if (!isNaN(num) && num > maxNumericId) maxNumericId = num;
  }
  console.log("現在の最大PID:", maxNumericId);

  let nextPid = maxNumericId + 1;

  // 1. データ消失患者の復元
  for (const p of LOST_PATIENTS) {
    const newPid = String(nextPid++);
    console.log("\n[" + p.name + "] LINE:" + p.lineId.slice(0, 12) + " → PID " + newPid);

    // answerers レコードを作成（最低限の情報のみ）
    const { error: insErr } = await sb.from("answerers").insert({
      patient_id: newPid,
      name: p.name,
      line_id: p.lineId,
    });
    if (insErr) {
      console.log("  answerers作成エラー:", insErr.message);
    } else {
      console.log("  answerers: 作成OK");
    }

    // message_log の patient_id を更新
    const { error: msgErr } = await sb.from("message_log")
      .update({ patient_id: newPid })
      .eq("patient_id", "10001")
      .eq("line_uid", p.lineId);
    if (msgErr) {
      console.log("  message_log更新エラー:", msgErr.message);
    } else {
      console.log("  message_log: 更新OK");
    }
  }

  // 2. 最終確認
  const { count } = await sb.from("message_log")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", "10001");
  console.log("\n=== 最終確認 ===");
  console.log("message_log PID 10001 残留:", count, "件");

  if (count > 0) {
    const { data: remaining } = await sb.from("message_log")
      .select("id, line_uid, direction, content, sent_at")
      .eq("patient_id", "10001")
      .limit(5);
    console.log("残留レコード:");
    for (const r of remaining || []) {
      console.log("  id:", r.id, r.line_uid?.slice(0, 12), r.direction, r.content?.slice(0, 40));
    }
  }

  // 全テーブル最終チェック
  const tables = ["answerers", "intake", "reservations", "orders", "reorders",
    "message_log", "patient_tags", "patient_marks", "friend_field_values"];
  let hasResidual = false;
  for (const t of tables) {
    const { count: c } = await sb.from(t).select("*", { count: "exact", head: true }).eq("patient_id", "10001");
    if (c > 0) {
      console.log(t + ": " + c + "件残留");
      hasResidual = true;
    }
  }
  if (!hasResidual) console.log("\n全テーブル PID 10001 = 0件 (完全クリーン)");

  console.log("\n=== Phase 2 完了 ===");
  console.log("注意: 消失患者は再度LINEからマイページにアクセスすれば自動的にデータが紐づきます");
  console.log("ただし個人情報（氏名・生年月日等）は再入力が必要です");
}

main().catch(console.error);
