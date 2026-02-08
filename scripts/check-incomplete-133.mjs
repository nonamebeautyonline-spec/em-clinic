// 133件の不完全レコードの詳細を調査

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

async function main() {
  console.log("========================================");
  console.log("133件の不完全レコード詳細調査");
  console.log("========================================\n");

  // 不完全レコードを取得
  let incomplete = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("intake")
      .select("patient_id, patient_name, answers, created_at, answerer_id, line_id, reserve_id")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) break;

    data.forEach(row => {
      if (!row.answers || !row.answers.ng_check) {
        incomplete.push(row);
      }
    });
    offset += limit;
    if (data.length < limit) break;
  }

  console.log(`不完全レコード総数: ${incomplete.length}件\n`);

  // answersの内容分析
  const hasLineId = incomplete.filter(r => r.line_id).length;
  const hasAnswererId = incomplete.filter(r => r.answerer_id).length;
  const hasReserveId = incomplete.filter(r => r.reserve_id).length;
  const hasAnswers = incomplete.filter(r => r.answers && Object.keys(r.answers).length > 0).length;

  console.log("【属性分析】");
  console.log(`  line_idあり: ${hasLineId}件`);
  console.log(`  answerer_idあり: ${hasAnswererId}件`);
  console.log(`  reserve_idあり: ${hasReserveId}件`);
  console.log(`  answersあり（部分的）: ${hasAnswers}件`);

  // answersの内容を調査
  console.log("\n【answersの内容パターン】");
  const patterns = {};
  incomplete.forEach(row => {
    if (row.answers) {
      const keys = Object.keys(row.answers).sort().join(",");
      patterns[keys] = (patterns[keys] || 0) + 1;
    } else {
      patterns["(null)"] = (patterns["(null)"] || 0) + 1;
    }
  });

  Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([k, v]) => {
      console.log(`  ${v}件: ${k.slice(0, 100)}${k.length > 100 ? "..." : ""}`);
    });

  // 最新10件の詳細
  console.log("\n【最新10件の詳細】");
  incomplete.slice(0, 10).forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.patient_id} / ${r.patient_name || "-"}`);
    console.log(`   created: ${r.created_at?.slice(0, 16)}`);
    console.log(`   line_id: ${r.line_id || "-"}`);
    console.log(`   answerer_id: ${r.answerer_id || "-"}`);
    console.log(`   reserve_id: ${r.reserve_id || "-"}`);
    if (r.answers) {
      const keys = Object.keys(r.answers);
      console.log(`   answersキー(${keys.length}): ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}`);
    }
  });

  // 予約があるか確認
  console.log("\n【予約状況】");
  const pids = incomplete.map(r => r.patient_id);
  const { data: reservations } = await supabase
    .from("reservations")
    .select("patient_id, reserved_date, status")
    .in("patient_id", pids);

  const withReservation = new Set((reservations || []).map(r => r.patient_id));
  console.log(`  予約あり: ${withReservation.size}件`);
  console.log(`  予約なし: ${incomplete.length - withReservation.size}件`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
