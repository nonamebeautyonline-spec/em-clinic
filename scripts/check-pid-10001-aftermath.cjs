// PID 10001 修復後の確認スクリプト
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. 修復済み4人の intake - answers が他人の情報で上書きされていないか
  const pids = ["20260201025", "20260201026", "20260201027", "20260201028"];
  const names = ["安田乃愛", "玉田楓花", "加藤日菜子", "渡邉裕大"];
  for (let i = 0; i < pids.length; i++) {
    const { data } = await sb
      .from("intake")
      .select("id, patient_name, line_id, answers, created_at, updated_at")
      .eq("patient_id", pids[i])
      .order("created_at", { ascending: true });
    console.log("\nPID", pids[i], "(" + names[i] + "):");
    for (const r of data || []) {
      const ans = r.answers || {};
      const wasUpdated = r.updated_at !== r.created_at ? " [UPDATED]" : "";
      console.log("  id:", r.id, "| patient_name:", r.patient_name,
        "| answers.name:", ans.name || ans["氏名"] || "(なし)", wasUpdated);
    }
  }

  // 2. 原田春陽 をシステム全体から検索
  const { data: haradaAns } = await sb.from("answerers")
    .select("patient_id, name, line_id").ilike("name", "%原田春陽%");
  console.log("\n=== 原田春陽 検索 ===");
  console.log("answerers:", haradaAns?.length ? JSON.stringify(haradaAns) : "なし");

  const { data: haradaInt } = await sb.from("intake")
    .select("id, patient_id, patient_name, line_id").ilike("patient_name", "%原田春陽%");
  console.log("intake:", haradaInt?.length ? JSON.stringify(haradaInt) : "なし");

  // 3. 2/15 08:43-08:46 の answerers 更新（原田春陽がいた時間帯）
  const { data: tw } = await sb.from("answerers")
    .select("patient_id, name, created_at, updated_at")
    .gte("updated_at", "2026-02-15T08:40:00")
    .lte("updated_at", "2026-02-15T08:50:00");
  console.log("\n=== 08:40-08:50 answerers更新 ===");
  (tw || []).forEach(r => console.log("  ", r.patient_id, r.name, r.updated_at));
  if (!tw?.length) console.log("  (なし)");

  // 4. PID 10001 残留データ最終チェック
  const tables = ["answerers", "intake", "reservations", "orders", "reorders",
    "message_log", "patient_tags", "patient_marks", "friend_field_values"];
  console.log("\n=== PID 10001 残留チェック ===");
  let hasResidual = false;
  for (const t of tables) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true }).eq("patient_id", "10001");
    if (count > 0) {
      console.log("  " + t + ":", count, "件 [要対応]");
      hasResidual = true;
    }
  }
  if (!hasResidual) console.log("  全テーブル 0件 (完全クリーン)");

  // 5. 苦情者候補の特定
  // 「予約が表示された → キャンセルした → 問診できなくなった」
  // → 予約 (原田春陽, 08:45) をキャンセルした人 (09:53)
  // 08:45〜09:53 の間に PID 10001 でアクセスした人
  console.log("\n=== 苦情者の候補 ===");
  console.log("予約作成: 08:45:49 (patient_name=原田春陽)");
  console.log("予約キャンセル: 09:53:12");
  console.log("08:43:39 玉田楓花 (U5b3c) 登録 → 10001");
  console.log("08:43:38 渡邉裕大 (Udd9d) answerers作成 → 上書き");
  console.log("09:44:30 安田乃愛 (U0bb5) intake作成");
  console.log("09:53:12 予約キャンセル ← この人が苦情者？");
  console.log("→ 安田乃愛 or 玉田楓花が苦情者の可能性が高い");
})();
