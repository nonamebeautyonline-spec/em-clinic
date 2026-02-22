// 影響を受けた13人の患者の answerer / intake / reservation 情報をリスト
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const sb = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const pids = [
  "20260200629", "20260200630", "20260200631", "20260200632",
  "20260200633", "20260200634", "20260200635", "20260200636",
  "20260200637", "20260200638", "20260200639", "20260200640",
  "20260200641",
];

console.log("=".repeat(100));
console.log("影響を受けた患者 13人の詳細情報");
console.log("=".repeat(100));

for (const pid of pids) {
  const { data: ans } = await sb.from("answerers").select("*").eq("patient_id", pid).maybeSingle();
  const { data: intake } = await sb.from("intake").select("*").eq("patient_id", pid).maybeSingle();
  const { data: orders } = await sb.from("orders").select("id, status, created_at").eq("patient_id", pid).order("created_at", { ascending: false }).limit(5);

  console.log(`\n--- PID: ${pid} ---`);
  console.log("【answerers】");
  if (ans) {
    console.log(`  氏名: ${ans.name} (${ans.name_kana})`);
    console.log(`  性別: ${ans.sex} | 生年月日: ${ans.birthday}`);
    console.log(`  TEL: ${ans.tel || "(未登録)"} | LINE ID: ${ans.line_id ? "あり" : "なし"}`);
  } else {
    console.log("  (レコードなし)");
  }

  console.log("【intake】");
  if (intake) {
    console.log(`  patient_name: ${intake.patient_name}`);
    console.log(`  line_id: ${intake.line_id ? "あり" : "なし"} | line_display_name: ${intake.line_display_name || "(なし)"}`);
    console.log(`  status: ${intake.status || "(未設定)"}`);
    console.log(`  reserve_id: ${intake.reserve_id || "(なし)"}`);
    console.log(`  reserved_date: ${intake.reserved_date || "(なし)"} ${intake.reserved_time || ""}`);
    const ansKeys = intake.answers ? Object.keys(intake.answers) : [];
    console.log(`  answers keys: ${ansKeys.join(", ") || "(空)"}`);
    console.log(`  answers.tel: ${intake.answers?.tel || intake.answers?.["電話番号"] || "(なし)"}`);
  } else {
    console.log("  (レコードなし)");
  }

  console.log("【orders】");
  if (orders && orders.length > 0) {
    for (const o of orders) {
      console.log(`  id: ${o.id} | status: ${o.status} | created: ${o.created_at}`);
    }
  } else {
    console.log("  (注文なし)");
  }
}

console.log("\n" + "=".repeat(100));
