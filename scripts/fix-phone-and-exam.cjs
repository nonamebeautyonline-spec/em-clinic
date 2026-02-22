// 電話番号の入れ替え + 診察データをりさこ→ほのかに移行
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

const PID_RISAKO = "20260200701";    // りさこ（診察未）
const PID_HONOKA = "20260200905";    // ほのか/新家穂花（診察後）
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== 本番実行 ===");

  // 現在の状態を確認
  const { data: a1 } = await sb.from("answerers").select("*").eq("patient_id", PID_RISAKO).maybeSingle();
  const { data: a2 } = await sb.from("answerers").select("*").eq("patient_id", PID_HONOKA).maybeSingle();
  const { data: resv } = await sb.from("reservations").select("*").eq("reserve_id", "resv-1770671374243").maybeSingle();
  const { data: i1 } = await sb.from("intake").select("id, patient_id, status, reserve_id, answers").eq("id", 33458).maybeSingle();
  const { data: i2 } = await sb.from("intake").select("id, patient_id, status, reserve_id, answers").eq("id", 33755).maybeSingle();

  console.log("\n--- 修正前 ---");
  console.log(`  りさこ answerers.tel: ${a1?.tel} → 09094385169 に変更`);
  console.log(`  ほのか answerers.tel: ${a2?.tel} → 08088405581 に変更`);
  console.log(`  予約 PID: ${resv?.patient_id} → ${PID_HONOKA} に変更`);
  console.log(`  予約 patient_name: ${resv?.patient_name} → 新家 穂花 に変更`);
  console.log(`  intake 33458 status: ${i1?.status} → null に変更（りさこ=診察未）`);
  console.log(`  intake 33458 reserve_id: ${i1?.reserve_id} → null に変更`);
  console.log(`  intake 33755 status: ${i2?.status} → OK に変更（ほのか=診察後）`);
  console.log(`  intake 33755 reserve_id: ${i2?.reserve_id || "なし"} → resv-1770671374243 に変更`);

  if (DRY_RUN) {
    console.log("\n=== DRY RUN 完了 ===");
    return;
  }

  // === 本番実行 ===

  // 1) 電話番号を入れ替え
  console.log("\n1) 電話番号入れ替え...");
  const { error: e1a } = await sb.from("answerers")
    .update({ tel: "09094385169" })
    .eq("patient_id", PID_RISAKO);
  if (e1a) { console.error("  エラー:", e1a.message); return; }
  console.log(`  りさこ (${PID_RISAKO}): tel → 09094385169`);

  const { error: e1b } = await sb.from("answerers")
    .update({ tel: "08088405581" })
    .eq("patient_id", PID_HONOKA);
  if (e1b) { console.error("  エラー:", e1b.message); return; }
  console.log(`  ほのか (${PID_HONOKA}): tel → 08088405581`);

  // 2) 予約をほのかに移行
  console.log("\n2) 予約をほのかに移行...");
  const { error: e2 } = await sb.from("reservations")
    .update({
      patient_id: PID_HONOKA,
      patient_name: "新家 穂花",
    })
    .eq("reserve_id", "resv-1770671374243");
  if (e2) { console.error("  エラー:", e2.message); return; }
  console.log("  → OK");

  // 3) intake 33458: りさこ=診察未（status null, reserve_id null）
  console.log("\n3) intake 33458: りさこ=診察未...");
  const { error: e3 } = await sb.from("intake")
    .update({ status: null, reserve_id: null })
    .eq("id", 33458);
  if (e3) { console.error("  エラー:", e3.message); return; }
  console.log("  → status=null, reserve_id=null");

  // 4) intake 33755: ほのか=診察後（status OK, reserve_id 紐付け）
  console.log("\n4) intake 33755: ほのか=診察後...");
  const { error: e4 } = await sb.from("intake")
    .update({ status: "OK", reserve_id: "resv-1770671374243" })
    .eq("id", 33755);
  if (e4) { console.error("  エラー:", e4.message); return; }
  console.log("  → status=OK, reserve_id=resv-1770671374243");

  // 5) intake answers の電話番号も修正
  console.log("\n5) intake answers 電話番号修正...");
  if (i1?.answers) {
    const newAnswers1 = { ...i1.answers, "電話番号": "09094385169", tel: "09094385169" };
    const { error: e5a } = await sb.from("intake").update({ answers: newAnswers1 }).eq("id", 33458);
    if (e5a) console.error("  intake 33458 エラー:", e5a.message);
    else console.log("  intake 33458: 電話番号 → 09094385169");
  }
  if (i2?.answers) {
    const newAnswers2 = { ...i2.answers, "電話番号": "08088405581", tel: "08088405581" };
    const { error: e5b } = await sb.from("intake").update({ answers: newAnswers2 }).eq("id", 33755);
    if (e5b) console.error("  intake 33755 エラー:", e5b.message);
    else console.log("  intake 33755: 電話番号 → 08088405581");
  }

  // 6) 不通マークをりさこから削除（診察は未だが、マークの意味が変わる）
  // マークはそのまま残すか確認が必要だが、ひとまず残す

  // === 検証 ===
  console.log("\n=== 修正後の確認 ===");
  const { data: va1 } = await sb.from("answerers").select("patient_id, name, tel, line_id").eq("patient_id", PID_RISAKO).maybeSingle();
  const { data: va2 } = await sb.from("answerers").select("patient_id, name, tel, line_id").eq("patient_id", PID_HONOKA).maybeSingle();
  console.log(`  りさこ: ${va1?.name} | tel=${va1?.tel} | UID=...${(va1?.line_id||"").slice(-8)}`);
  console.log(`  ほのか: ${va2?.name} | tel=${va2?.tel} | UID=...${(va2?.line_id||"").slice(-8)}`);

  const { data: vr } = await sb.from("reservations").select("reserve_id, patient_id, patient_name, status, prescription_menu").eq("reserve_id", "resv-1770671374243").maybeSingle();
  console.log(`  予約: PID=${vr?.patient_id} name=${vr?.patient_name} status=${vr?.status} menu=${vr?.prescription_menu}`);

  const { data: vi1 } = await sb.from("intake").select("id, patient_id, status, reserve_id").eq("id", 33458).maybeSingle();
  const { data: vi2 } = await sb.from("intake").select("id, patient_id, status, reserve_id").eq("id", 33755).maybeSingle();
  console.log(`  intake 33458: PID=${vi1?.patient_id} status=${vi1?.status} reserve=${vi1?.reserve_id||"null"}`);
  console.log(`  intake 33755: PID=${vi2?.patient_id} status=${vi2?.status} reserve=${vi2?.reserve_id||"null"}`);
}

main().catch(console.error);
