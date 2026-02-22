// 植本理紗子 / 新家穂花 のPID衝突を修復
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

const DRY_RUN = process.argv.includes("--dry-run");

const OLD_PID = "20260200701";
const UEMOTO_UID = "U901eed1faa9fb4b86da8f0bf796890ac";
const SHINKE_UID = "U03dabc044e7b04d2a695b3c33b119cfd";
const SHINKE_INTAKE_ID = 33755;

// 新家のメッセージと判定できるID一覧（内容ベース）
// 3472-3474: 友だち追加「ほのかさま」
// 8341: 「電話番号が09094385169」（新家の番号）
// 9040: 「違う方のお名前が表示される」
// 9042: スクリーンショット
// 9046: 「私は新家 穂花」
// 9185-9186: スクリーンショット＋問い合わせ
// 9221-9223: 「決済とは何でしょうか」等
const SHINKE_MSG_IDS = [3472, 3473, 3474, 8341, 9040, 9042, 9046, 9185, 9186, 9221, 9223];

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== 本番実行 ===");

  // 0) 植本の問診データから個人情報を取得
  const { data: uemotoIntake } = await sb.from("intake")
    .select("answers")
    .eq("id", 33458)
    .maybeSingle();
  if (!uemotoIntake?.answers) { console.error("植本のintake answers が見つからない"); return; }

  const ans = uemotoIntake.answers;
  const uemotoInfo = {
    name: ans["氏名"] || ans.name,
    name_kana: ans["カナ"] || ans.name_kana,
    sex: ans["性別"] || ans.sex,
    birthday: ans["生年月日"] || ans.birth,
    tel: ans["電話番号"] || ans.tel,
  };
  console.log("\n1) 植本理紗子の個人情報（intake answersから復元）:");
  console.log("  ", JSON.stringify(uemotoInfo, null, 2));

  // 1) 新しいPIDを発番
  const { data: maxRow } = await sb.from("answerers")
    .select("patient_id")
    .order("patient_id", { ascending: false })
    .limit(10);

  let maxNumericId = 10000;
  if (maxRow) {
    for (const row of maxRow) {
      const num = Number(row.patient_id);
      if (!isNaN(num) && num > maxNumericId) maxNumericId = num;
    }
  }
  const newPid = String(maxNumericId + 1);
  console.log(`\n2) 新家穂花の新PID: ${newPid}`);

  // 2) 現在の新家の answerers データ
  const { data: shinkeAns } = await sb.from("answerers")
    .select("*")
    .eq("patient_id", OLD_PID)
    .maybeSingle();
  console.log("\n3) 現在のanswerers (20260200701):", shinkeAns?.name, shinkeAns?.tel);

  if (DRY_RUN) {
    console.log("\n=== DRY RUN: 以下の操作を実行予定 ===");
    console.log(`a) answerers PID=${OLD_PID} を植本理紗子で復元`);
    console.log(`b) reservation patient_name を「植本理紗子」に戻す`);
    console.log(`c) intake id=${SHINKE_INTAKE_ID} → 新PID ${newPid}`);
    console.log(`d) 新家穂花 answerers を新PID ${newPid} で作成`);
    console.log(`e) message_log: 判別可能な ${SHINKE_MSG_IDS.length}件 を新PIDに移行`);
    console.log(`   対象ID: ${SHINKE_MSG_IDS.join(", ")}`);
    console.log(`   ※リッチメニュー操作等の判別不能メッセージは植本側に残す`);
    return;
  }

  // === 本番実行 ===

  // a) answerers を植本理紗子で復元
  console.log("\na) answerers を植本理紗子で復元...");
  const { error: e1 } = await sb.from("answerers")
    .update({
      name: uemotoInfo.name,
      name_kana: uemotoInfo.name_kana,
      sex: uemotoInfo.sex,
      birthday: uemotoInfo.birthday,
      tel: uemotoInfo.tel,
      line_id: UEMOTO_UID,
      updated_at: new Date().toISOString(),
    })
    .eq("patient_id", OLD_PID);
  if (e1) { console.error("  エラー:", e1.message); return; }
  console.log("  → OK");

  // b) reservation patient_name を植本理紗子に戻す
  console.log("\nb) reservation patient_name を植本理紗子に戻す...");
  const { error: e2 } = await sb.from("reservations")
    .update({ patient_name: uemotoInfo.name })
    .eq("patient_id", OLD_PID);
  if (e2) { console.error("  エラー:", e2.message); return; }
  console.log("  → OK");

  // c) intake id=33755 → 新PID
  console.log(`\nc) intake id=${SHINKE_INTAKE_ID} → ${newPid}...`);
  const { error: e3 } = await sb.from("intake")
    .update({ patient_id: newPid })
    .eq("id", SHINKE_INTAKE_ID);
  if (e3) { console.error("  エラー:", e3.message); return; }
  console.log("  → OK");

  // d) 新家穂花 answerers 作成
  console.log(`\nd) 新家穂花 answerers を ${newPid} で作成...`);
  const { error: e4 } = await sb.from("answerers")
    .insert({
      patient_id: newPid,
      name: shinkeAns?.name || "新家 穂花",
      name_kana: shinkeAns?.name_kana || "シンヤ ホノカ",
      sex: shinkeAns?.sex || "女",
      birthday: shinkeAns?.birthday || "2006-11-12",
      tel: shinkeAns?.tel || "09094385169",
      line_id: SHINKE_UID,
    });
  if (e4) { console.error("  エラー:", e4.message); return; }
  console.log("  → OK");

  // e) message_log: 判別可能なメッセージを新PIDに移行
  console.log(`\ne) message_log: ${SHINKE_MSG_IDS.length}件 を ${newPid} に移行...`);
  const { data: moved, error: e5 } = await sb.from("message_log")
    .update({ patient_id: newPid })
    .eq("patient_id", OLD_PID)
    .in("id", SHINKE_MSG_IDS)
    .select("id");
  if (e5) { console.error("  エラー:", e5.message); }
  else { console.log(`  → ${moved?.length || 0}件 移行OK`); }

  // f) admin → 新家 への個別送信も移行（内容で判定）
  console.log("\nf) admin→新家の個別送信を移行...");
  // id=9184,9187,9222 は admin → 新家への返信（前後の文脈から）
  const ADMIN_TO_SHINKE = [9184, 9187, 9222];
  const { data: moved2, error: e6 } = await sb.from("message_log")
    .update({ patient_id: newPid })
    .eq("patient_id", OLD_PID)
    .in("id", ADMIN_TO_SHINKE)
    .select("id");
  if (e6) { console.error("  エラー:", e6.message); }
  else { console.log(`  → ${moved2?.length || 0}件 移行OK`); }

  // 検証
  console.log("\n=== 修復後の確認 ===");
  const { data: v1 } = await sb.from("answerers").select("patient_id, name, line_id, tel").eq("patient_id", OLD_PID).maybeSingle();
  console.log(`answerers (${OLD_PID}): ${v1?.name} tel=${v1?.tel} line_id=...${v1?.line_id?.slice(-8)}`);

  const { data: v2 } = await sb.from("answerers").select("patient_id, name, line_id, tel").eq("patient_id", newPid).maybeSingle();
  console.log(`answerers (${newPid}): ${v2?.name} tel=${v2?.tel} line_id=...${v2?.line_id?.slice(-8)}`);

  const { data: v3 } = await sb.from("reservations").select("patient_id, patient_name").eq("patient_id", OLD_PID);
  console.log(`reservations (${OLD_PID}): ${v3?.map(r => r.patient_name)}`);

  const { data: v4 } = await sb.from("intake").select("id, patient_id, line_id").eq("id", SHINKE_INTAKE_ID).maybeSingle();
  console.log(`intake id=${SHINKE_INTAKE_ID}: pid=${v4?.patient_id} line_id=...${v4?.line_id?.slice(-8)}`);

  const { count: c1 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", OLD_PID);
  const { count: c2 } = await sb.from("message_log").select("*", { count: "exact", head: true }).eq("patient_id", newPid);
  console.log(`message_log: ${OLD_PID}=${c1}件, ${newPid}=${c2}件`);

  console.log("\n※ リッチメニュー操作等の判別不能メッセージ(3475-3483, 8322-8327, 8343-8348)は植本側に残しています");
}

main().catch(console.error);
