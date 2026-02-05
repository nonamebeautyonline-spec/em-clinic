import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPeriod() {
  const startDate = "2026-01-31";
  const endDate = "2026-02-06";

  console.log("========================================");
  console.log("期間: " + startDate + " 〜 " + endDate);
  console.log("========================================");

  // この期間の総数
  const { count: total } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  // LINE UIDあり
  const { count: withLineId } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lt("created_at", endDate)
    .not("line_id", "is", null)
    .neq("line_id", "");

  const withoutLineId = total - withLineId;

  console.log("新規ユーザー数: " + total + "人");
  console.log("LINE UIDあり: " + withLineId + "人 (" + ((withLineId / total) * 100).toFixed(1) + "%)");
  console.log("LINE UIDなし: " + withoutLineId + "人 (" + ((withoutLineId / total) * 100).toFixed(1) + "%)");

  // 日別内訳
  console.log("\n【日別内訳】");
  for (let d = 31; d <= 31; d++) {
    const date = "2026-01-" + String(d).padStart(2, "0");
    const nextDate = "2026-02-01";
    const { count: dayTotal } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", date)
      .lt("created_at", nextDate);
    const { count: dayWith } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", date)
      .lt("created_at", nextDate)
      .not("line_id", "is", null)
      .neq("line_id", "");
    console.log(date + ": " + dayTotal + "人 (LINE有: " + dayWith + ", なし: " + (dayTotal - dayWith) + ")");
  }

  for (let d = 1; d <= 5; d++) {
    const date = "2026-02-" + String(d).padStart(2, "0");
    const nextDate = "2026-02-" + String(d + 1).padStart(2, "0");
    const { count: dayTotal } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", date)
      .lt("created_at", nextDate);
    const { count: dayWith } = await supabase
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", date)
      .lt("created_at", nextDate)
      .not("line_id", "is", null)
      .neq("line_id", "");
    console.log(date + ": " + dayTotal + "人 (LINE有: " + dayWith + ", なし: " + (dayTotal - dayWith) + ")");
  }
}

// checkPeriod();

async function checkNoLoginUsers() {
  console.log("========================================");
  console.log("answerer_idあり & LINE UIDなし の人");
  console.log("========================================");

  // answerer_idあり & LINE UIDなしの人を取得
  const { data: noLineUsers, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, answerer_id, answers, created_at")
    .or("line_id.is.null,line_id.eq.")
    .not("answerer_id", "is", null)
    .neq("answerer_id", "")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`該当者: ${noLineUsers.length}人`);

  // answersカラムに電話番号が含まれているか確認
  let withPhoneInAnswers = 0;
  let withoutPhoneInAnswers = 0;

  noLineUsers.forEach(u => {
    if (u.answers) {
      const answersStr = JSON.stringify(u.answers);
      // 電話番号らしきパターンを探す
      if (answersStr.includes("電話") || answersStr.includes("tel") || answersStr.includes("phone") || /0[789]0\d{8}/.test(answersStr)) {
        withPhoneInAnswers++;
      } else {
        withoutPhoneInAnswers++;
      }
    } else {
      withoutPhoneInAnswers++;
    }
  });

  console.log(`\nanswersに電話番号あり: ${withPhoneInAnswers}人`);
  console.log(`answersに電話番号なし: ${withoutPhoneInAnswers}人`);

  // ordersテーブルで決済履歴があるか確認
  const patientIds = noLineUsers.map(u => u.patient_id);
  const { data: ordersData } = await supabase
    .from("orders")
    .select("patient_id")
    .in("patient_id", patientIds);

  const patientsWithOrders = new Set((ordersData || []).map(o => o.patient_id));
  const withOrders = noLineUsers.filter(u => patientsWithOrders.has(u.patient_id)).length;
  const withoutOrders = noLineUsers.length - withOrders;

  console.log(`\n【参考】決済履歴あり: ${withOrders}人`);
  console.log(`【参考】決済履歴なし: ${withoutOrders}人`);

  // サンプル表示
  console.log("\n【最新5件のanswersサンプル】");
  noLineUsers.slice(0, 5).forEach((u, i) => {
    console.log(`\n--- ${i + 1}. ${u.patient_id} ---`);
    if (u.answers && typeof u.answers === "object") {
      const keys = Object.keys(u.answers);
      console.log("answersキー:", keys.slice(0, 10).join(", ") + (keys.length > 10 ? "..." : ""));
    } else {
      console.log("answers: null or empty");
    }
  });
}

checkNoLoginUsers();

/*
async function checkPeriod() {
  // countを使って総数を取得（1000件制限を回避）
  const { count: total, error: e1 } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true });

  if (e1) {
    console.error("総数取得エラー:", e1);
    return;
  }

  // LINE UIDがある人（null以外かつ空文字以外）
  const { count: withLineId, error: e2 } = await supabase
    .from("intake")
    .select("*", { count: "exact", head: true })
    .not("line_id", "is", null)
    .neq("line_id", "");

  if (e2) {
    console.error("LINE UIDあり取得エラー:", e2);
    return;
  }

  // LINE UIDがない人
  const withoutLineId = total - withLineId;
  const percentageWithout = ((withoutLineId / total) * 100).toFixed(1);
  const percentageWith = ((withLineId / total) * 100).toFixed(1);

  console.log("========================================");
  console.log("マイページユーザーのLINE UID状況");
  console.log("========================================");
  console.log("総ユーザー数: " + total + "人");
  console.log("LINE UIDあり: " + withLineId + "人 (" + percentageWith + "%)");
  console.log("LINE UIDなし: " + withoutLineId + "人 (" + percentageWithout + "%)");
  console.log("========================================");

  // LINE UIDなしの人の詳細を調査
  console.log("\n【LINE UIDなしの人の詳細】");

  // 最古と最新の作成日を取得
  const { data: noLineUsers } = await supabase
    .from("intake")
    .select("patient_id, patient_name, created_at, answerer_id")
    .or("line_id.is.null,line_id.eq.")
    .order("created_at", { ascending: true })
    .limit(200);

  if (noLineUsers && noLineUsers.length > 0) {
    const oldest = noLineUsers[0];
    const newest = noLineUsers[noLineUsers.length - 1];

    console.log("最古: " + (oldest.created_at || "不明"));
    console.log("最新: " + (newest.created_at || "不明"));

    // answerer_id（LステップID）の有無
    const withAnswererId = noLineUsers.filter(u => u.answerer_id && u.answerer_id !== "").length;
    console.log("LステップIDあり: " + withAnswererId + "人");
    console.log("LステップIDなし: " + (noLineUsers.length - withAnswererId) + "人");

    // 月別分布
    const monthCounts = {};
    noLineUsers.forEach(u => {
      if (u.created_at) {
        const month = u.created_at.slice(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });

    console.log("\n【月別分布（LINE UIDなし）】");
    Object.keys(monthCounts).sort().forEach(month => {
      console.log(month + ": " + monthCounts[month] + "人");
    });

    // 最新10件のサンプル
    console.log("\n【最新10件のサンプル】");
    const recent = [...noLineUsers].reverse().slice(0, 10);
    recent.forEach(u => {
      console.log("- " + u.patient_id + " / " + (u.patient_name || "名前なし") + " / " + (u.created_at ? u.created_at.slice(0, 10) : "日付不明") + " / LステップID:" + (u.answerer_id || "なし"));
    });
  }
}

check();
*/
