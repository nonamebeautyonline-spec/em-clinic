// ほのか（PID 20260200905）のマイページ表示データを確認
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
const PID = "20260200905";

async function main() {
  // 1. intake 全レコード
  const { data: intakes } = await sb.from("intake")
    .select("id, patient_id, patient_name, status, reserve_id, reserved_date, reserved_time, line_id, line_display_name, answers, created_at")
    .eq("patient_id", PID)
    .order("created_at", { ascending: true });

  console.log("=== intake ===");
  if (intakes) {
    for (const i of intakes) {
      const ans = i.answers || {};
      console.log(`  id=${i.id} name=${i.patient_name} status=${i.status} reserve_id=${i.reserve_id}`);
      console.log(`    reserved_date=${i.reserved_date} reserved_time=${i.reserved_time}`);
      console.log(`    line_id=${i.line_id ? i.line_id.slice(-8) : "null"} line_display_name=${i.line_display_name}`);
      console.log(`    ng_check=${ans.ng_check || "null"} tel=${ans.tel || ans["電話番号"] || "null"}`);
      console.log(`    created_at=${i.created_at}`);
    }
  } else {
    console.log("  なし");
  }

  // 2. answerers
  const { data: answerer } = await sb.from("answerers")
    .select("patient_id, name, name_kana, tel, line_id, sex, birthday")
    .eq("patient_id", PID)
    .maybeSingle();

  console.log("\n=== answerers ===");
  console.log(answerer ? JSON.stringify(answerer, null, 2) : "  なし");

  // 3. reservations
  const { data: reservations } = await sb.from("reservations")
    .select("id, reserve_id, patient_id, patient_name, reserved_date, reserved_time, status, note, prescription_menu")
    .eq("patient_id", PID)
    .order("created_at", { ascending: false });

  console.log("\n=== reservations ===");
  if (reservations && reservations.length > 0) {
    for (const r of reservations) {
      console.log(`  id=${r.id} reserve_id=${r.reserve_id} name=${r.patient_name} date=${r.reserved_date} time=${r.reserved_time} status=${r.status}`);
      if (r.note) console.log(`    note=${r.note}`);
      if (r.prescription_menu) console.log(`    prescription_menu=${r.prescription_menu}`);
    }
  } else {
    console.log("  なし");
  }

  // 4. orders
  const { data: orders } = await sb.from("orders")
    .select("id, patient_id, product_name, product_code, amount, paid_at, shipping_status, payment_status")
    .eq("patient_id", PID)
    .order("paid_at", { ascending: false });

  console.log("\n=== orders ===");
  if (orders && orders.length > 0) {
    for (const o of orders) {
      console.log(`  id=${o.id} product=${o.product_name} amount=${o.amount} paid=${o.paid_at} ship=${o.shipping_status} pay=${o.payment_status}`);
    }
  } else {
    console.log("  なし");
  }

  // 5. reorders
  const { data: reorders } = await sb.from("reorders")
    .select("id, patient_id, status, product_code, created_at, karte_note")
    .eq("patient_id", PID)
    .order("created_at", { ascending: false });

  console.log("\n=== reorders ===");
  if (reorders && reorders.length > 0) {
    for (const r of reorders) {
      console.log(`  id=${r.id} status=${r.status} product=${r.product_code} karte=${r.karte_note ? "あり" : "なし"} created=${r.created_at}`);
    }
  } else {
    console.log("  なし");
  }

  // マイページ表示のシミュレーション
  console.log("\n========== マイページ表示シミュレーション ==========");

  const firstIntake = intakes && intakes.length > 0 ? intakes[0] : null;
  const ans = (firstIntake?.answers || {});
  const hasIntake = !!ans.ng_check;
  const intakeStatus = firstIntake?.status || null;
  const displayName = firstIntake?.patient_name || "";
  const lineId = firstIntake?.line_id || "";

  console.log(`  表示名: ${displayName} さん`);
  console.log(`  PID: ${PID}`);
  console.log(`  問診完了: ${hasIntake}`);
  console.log(`  intakeStatus: ${intakeStatus}`);
  console.log(`  line_id: ${lineId ? lineId.slice(-8) : "未設定"}`);

  // 予約チェック（intake から reserve_id/date/time が揃っていて status が null or empty）
  const reservationIntake = intakes?.find(i =>
    i.reserve_id && i.reserved_date && i.reserved_time && (!i.status || i.status === "")
  );
  console.log(`  次回予約: ${reservationIntake ? `${reservationIntake.reserved_date} ${reservationIntake.reserved_time}` : "なし"}`);

  // 診察履歴（status=OK）
  const historyIntakes = intakes?.filter(i => i.status === "OK") || [];
  console.log(`  診察履歴: ${historyIntakes.length}件`);

  const isNG = intakeStatus === "NG";
  const hasHistory = historyIntakes.length > 0;

  console.log(`\n  --- 画面要素 ---`);
  console.log(`  問診ボタン: ${hasIntake ? "「問診はすでに完了しています」(disabled)" : "「問診に進む」(active)"}`);

  const canReserve = hasIntake && (!hasHistory || isNG) && !reservationIntake;
  console.log(`  予約ボタン: ${canReserve ? "有効" : "無効"}`);
  console.log(`    理由: hasIntake=${hasIntake} hasHistory=${hasHistory} isNG=${isNG} hasReservation=${!!reservationIntake}`);

  console.log(`  初回診察セクション: ${reservationIntake ? "予約表示" : hasHistory ? "診察ずみ表示" : "予約なし表示"}`);

  console.log(`  注文: ${orders ? orders.length : 0}件`);
  console.log(`  再処方: ${reorders ? reorders.length : 0}件`);

  // 整合性チェック（line_id）
  console.log(`\n  --- 整合性チェック ---`);
  console.log(`  intake.line_id: ${lineId || "未設定"}`);
  console.log(`  ほのかのLINE UID: U03dabc044e7b04d2a695b3c33b119cfd`);
  console.log(`  一致: ${lineId === "U03dabc044e7b04d2a695b3c33b119cfd" ? "OK" : "NG（pid_mismatch エラーになる可能性）"}`);
}

main().catch(console.error);
