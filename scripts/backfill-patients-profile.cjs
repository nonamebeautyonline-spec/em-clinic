// scripts/backfill-patients-profile.cjs
// intake.answers から patients テーブルに name_kana/sex/birthday を穴埋め
// 既存データは上書きしない（null のフィールドのみ）
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const dryRun = !process.argv.includes("--exec");
  console.log(dryRun ? "=== DRY RUN ===" : "=== 実行モード ===");

  // 対象: name_kana, sex, birthday のいずれかが null の患者
  const { data: patients } = await sb.from("patients")
    .select("patient_id, name, name_kana, sex, birthday")
    .limit(100000);

  const needsFill = patients.filter(p => !p.name_kana || !p.sex || !p.birthday);
  console.log("穴埋め候補:", needsFill.length, "人 / 全患者:", patients.length, "人");

  // intake.answers を取得（patient_id ごとに最新1件）
  const pids = needsFill.map(p => p.patient_id);
  const answersMap = {};

  for (let i = 0; i < pids.length; i += 500) {
    const batch = pids.slice(i, i + 500);
    const { data: intakes } = await sb.from("intake")
      .select("patient_id, answers")
      .in("patient_id", batch)
      .not("answers", "is", null)
      .order("created_at", { ascending: false })
      .limit(10000);

    for (const r of intakes) {
      if (!answersMap[r.patient_id]) answersMap[r.patient_id] = r.answers;
    }
  }

  console.log("intake.answers 取得:", Object.keys(answersMap).length, "人分\n");

  let updateCount = 0;
  let skipCount = 0;
  let kanaFilled = 0;
  let sexFilled = 0;
  let bdFilled = 0;
  const errors = [];

  for (const p of needsFill) {
    const a = answersMap[p.patient_id];
    if (!a) { skipCount++; continue; }

    const updates = {};

    // name_kana
    if (!p.name_kana) {
      const kana = a.カナ || a.name_kana || a.フリガナ || a.ふりがな || null;
      if (kana && kana.trim()) {
        updates.name_kana = kana.trim();
        kanaFilled++;
      }
    }

    // sex
    if (!p.sex) {
      const sex = a.性別 || a.sex || null;
      if (sex && sex.trim()) {
        updates.sex = sex.trim();
        sexFilled++;
      }
    }

    // birthday
    if (!p.birthday) {
      const bd = a.生年月日 || a.birthday || a.birth || null;
      if (bd) {
        // ISO形式やDate文字列を YYYY-MM-DD に正規化
        const bdStr = String(bd).trim();
        let normalized = null;
        if (/^\d{4}-\d{2}-\d{2}/.test(bdStr)) {
          normalized = bdStr.slice(0, 10);
        } else {
          const d = new Date(bdStr);
          if (!isNaN(d.getTime())) {
            normalized = d.toISOString().slice(0, 10);
          }
        }
        if (normalized) {
          updates.birthday = normalized;
          bdFilled++;
        }
      }
    }

    if (Object.keys(updates).length === 0) { skipCount++; continue; }

    updateCount++;

    if (!dryRun) {
      const { error } = await sb.from("patients")
        .update(updates)
        .eq("patient_id", p.patient_id);

      if (error) {
        errors.push({ pid: p.patient_id, error: error.message });
      }
    }
  }

  console.log("=== 結果 ===");
  console.log("更新対象:", updateCount, "人");
  console.log("スキップ（answersにデータなし）:", skipCount, "人");
  console.log("--- 内訳 ---");
  console.log("name_kana 穴埋め:", kanaFilled);
  console.log("sex 穴埋め:", sexFilled);
  console.log("birthday 穴埋め:", bdFilled);

  if (errors.length > 0) {
    console.log("\nエラー:", errors.length, "件");
    for (const e of errors.slice(0, 10)) {
      console.log("  " + e.pid + ": " + e.error);
    }
  }

  if (dryRun) {
    console.log("\n→ 実行するには: node scripts/backfill-patients-profile.cjs --exec");
  }
})();
