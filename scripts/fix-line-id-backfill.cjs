/**
 * LINE UID バックフィルスクリプト
 *
 * Phase 1: LINE_プレフィックス患者のうち正規患者とLINE UIDが重複 → LINE_患者を削除（line_id解放）
 * Phase 2: 正規患者で line_id=null だが intake.answers.line_id に LINE UID がある → patients.line_id を更新
 */
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes("--dry-run");

(async () => {
  if (DRY_RUN) console.log("=== DRY RUN モード（実際の更新なし） ===\n");

  // ────────────────────────────────────────────
  // Phase 1: LINE_患者の中で正規患者とLINE UID重複を先に解消
  // ────────────────────────────────────────────
  console.log("--- Phase 1: LINE_患者のクリーンアップ ---");

  const { data: linePatients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .like("patient_id", "LINE_%");

  console.log("LINE_プレフィックス患者: " + linePatients.length + "件");

  // intakeのanswers.line_idで正規患者とマッチングするためのマップ構築
  const lineUidToLinePid = new Map();
  for (const lp of linePatients) {
    if (lp.line_id) lineUidToLinePid.set(lp.line_id, lp);
  }

  // 正規患者のintakeからline_idを収集
  const { data: allIntake } = await sb
    .from("intake")
    .select("patient_id, answers")
    .not("patient_id", "like", "LINE_%");

  // intake.answers.line_id → 正規patient_id のマップ
  const uidToProperPid = new Map();
  for (const row of allIntake || []) {
    const uid = row.answers?.line_id;
    if (uid && uid.startsWith("U") && lineUidToLinePid.has(uid)) {
      uidToProperPid.set(uid, row.patient_id);
    }
  }

  // patients.line_id で既にマッチしている正規患者も追加
  for (const lp of linePatients) {
    if (!lp.line_id) continue;
    const { data: proper } = await sb
      .from("patients")
      .select("patient_id")
      .eq("line_id", lp.line_id)
      .not("patient_id", "like", "LINE_%");
    if (proper && proper.length > 0 && !uidToProperPid.has(lp.line_id)) {
      uidToProperPid.set(lp.line_id, proper[0].patient_id);
    }
  }

  console.log("正規患者と重複するLINE_患者: " + uidToProperPid.size + "件");

  let cleaned = 0;
  for (const [uid, properPid] of uidToProperPid) {
    const lp = lineUidToLinePid.get(uid);
    if (!lp) continue;

    console.log("  " + lp.patient_id + " (" + (lp.name || "null") + ") -> 正規: " + properPid);

    if (!DRY_RUN) {
      // LINE_患者の intake を削除
      await sb.from("intake").delete().eq("patient_id", lp.patient_id);
      // LINE_患者の予約を削除（あれば）
      await sb.from("reservations").delete().eq("patient_id", lp.patient_id);
      // LINE_患者レコードを削除
      const { error } = await sb.from("patients").delete().eq("patient_id", lp.patient_id);
      if (error) console.log("    削除エラー: " + error.message);
      else console.log("    削除完了");
    }
    cleaned++;
  }
  console.log("Phase 1 完了: " + cleaned + "件クリーンアップ\n");

  // ────────────────────────────────────────────
  // Phase 2: 正規患者の line_id バックフィル
  // ────────────────────────────────────────────
  console.log("--- Phase 2: 正規患者の line_id バックフィル ---");

  const { data: nullLinePatients } = await sb
    .from("patients")
    .select("patient_id, name, line_id")
    .is("line_id", null)
    .not("patient_id", "like", "LINE_%");

  console.log("line_id=null の正規患者: " + nullLinePatients.length + "件");

  const toUpdate = [];
  for (const p of nullLinePatients) {
    const { data: intakes } = await sb
      .from("intake")
      .select("answers")
      .eq("patient_id", p.patient_id);

    for (const intake of intakes || []) {
      const uid = intake.answers?.line_id;
      if (uid && uid.startsWith("U") && uid.length > 20) {
        toUpdate.push({ patient_id: p.patient_id, name: p.name, line_uid: uid });
        break;
      }
    }
  }

  console.log("更新対象: " + toUpdate.length + "件");

  // 重複チェック
  const uidCount = {};
  for (const item of toUpdate) {
    uidCount[item.line_uid] = (uidCount[item.line_uid] || 0) + 1;
  }
  const dupes = Object.entries(uidCount).filter(([_, c]) => c > 1);
  if (dupes.length > 0) {
    console.log("WARNING: 重複 LINE UID:");
    dupes.forEach(([uid, count]) => console.log("  " + uid + " -> " + count + "件"));
  }

  // 衝突チェック（LINE_患者は Phase 1 で消えているはず）
  const allUids = toUpdate.map((u) => u.line_uid);
  const { data: alreadySet } = await sb
    .from("patients")
    .select("patient_id, line_id")
    .in("line_id", allUids.length > 0 ? allUids : ["__none__"]);
  const takenUids = new Set((alreadySet || []).map((p) => p.line_id));

  let updated = 0;
  let skipped = 0;
  for (const item of toUpdate) {
    if (takenUids.has(item.line_uid)) {
      skipped++;
      continue;
    }
    if (uidCount[item.line_uid] > 1) {
      console.log("  SKIP(重複): " + item.patient_id + " " + item.name);
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      const { error } = await sb
        .from("patients")
        .update({ line_id: item.line_uid })
        .eq("patient_id", item.patient_id);
      if (error) {
        console.log("  ERROR: " + item.patient_id + " " + error.message);
        continue;
      }
    }
    updated++;
  }
  console.log("Phase 2 完了: 更新=" + updated + " スキップ=" + skipped + "\n");

  // ────────────────────────────────────────────
  // 結果確認
  // ────────────────────────────────────────────
  if (!DRY_RUN) {
    const { count: remainingNull } = await sb
      .from("patients")
      .select("patient_id", { count: "exact", head: true })
      .is("line_id", null)
      .not("patient_id", "like", "LINE_%");
    console.log("残りの line_id=null 正規患者: " + remainingNull + "件");

    const { count: remainingLine } = await sb
      .from("patients")
      .select("patient_id", { count: "exact", head: true })
      .like("patient_id", "LINE_%");
    console.log("残りの LINE_プレフィックス患者: " + remainingLine + "件");

    // 眞鍋志保の確認
    const { data: check } = await sb
      .from("patients")
      .select("patient_id, name, line_id")
      .eq("patient_id", "20260200457")
      .single();
    console.log("\n眞鍋志保の確認:", JSON.stringify(check));
  }
})();
