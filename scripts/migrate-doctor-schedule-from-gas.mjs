// scripts/migrate-doctor-schedule-from-gas.mjs
// GASスプレッドシートからDrシフトデータをSupabase DBに移行

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables
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

// GAS_RESERVATIONS_URL が予約・シフト管理用のGAS
const GAS_URL = envVars.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = envVars.ADMIN_TOKEN;

if (!GAS_URL || !ADMIN_TOKEN) {
  console.error("GAS_RESERVATIONS_URL または ADMIN_TOKEN が設定されていません");
  process.exit(1);
}

console.log("=== GASからDrシフトデータを移行 ===\n");

// GAS APIからデータ取得
async function fetchFromGAS(type, params = {}) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, token: ADMIN_TOKEN, ...params }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("GAS parse error:", text);
    return { ok: false };
  }
}

// 1. 医師データ取得・移行
console.log("1. 医師データを取得中...");
const doctorsRes = await fetchFromGAS("getScheduleRange", {
  start: "2000-01-01",
  end: "2000-01-01",
});

if (!doctorsRes.ok) {
  console.error("医師データ取得失敗:", doctorsRes);
  process.exit(1);
}

const doctors = doctorsRes.doctors || [];
console.log(`   取得件数: ${doctors.length}件`);

// DBに挿入
let doctorsInserted = 0;
for (const doc of doctors) {
  if (!doc.doctor_id) continue;

  const { error } = await supabase.from("doctors").upsert(
    {
      doctor_id: doc.doctor_id,
      doctor_name: doc.doctor_name || "",
      is_active: doc.is_active === true || doc.is_active === "TRUE",
      sort_order: Number(doc.sort_order) || 0,
      color: doc.color || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id" }
  );

  if (error) {
    console.error(`   ❌ ${doc.doctor_id}:`, error.message);
  } else {
    doctorsInserted++;
  }
}
console.log(`   → ${doctorsInserted}件をDBに挿入/更新\n`);

// 2. 週間ルール取得・移行
console.log("2. 週間ルールを取得中...");
const weeklyRules = doctorsRes.weekly_rules || [];
console.log(`   取得件数: ${weeklyRules.length}件`);

let rulesInserted = 0;
for (const rule of weeklyRules) {
  if (!rule.doctor_id) continue;

  // 時間を "HH:MM" 形式に正規化
  const startTime = normalizeTime(rule.start_time);
  const endTime = normalizeTime(rule.end_time);

  const { error } = await supabase.from("doctor_weekly_rules").upsert(
    {
      doctor_id: rule.doctor_id,
      weekday: Number(rule.weekday),
      enabled: rule.enabled === true || rule.enabled === "TRUE",
      start_time: startTime || null,
      end_time: endTime || null,
      slot_minutes: Number(rule.slot_minutes) || 15,
      capacity: Number(rule.capacity) || 2,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id,weekday" }
  );

  if (error) {
    console.error(`   ❌ ${rule.doctor_id} weekday=${rule.weekday}:`, error.message);
  } else {
    rulesInserted++;
  }
}
console.log(`   → ${rulesInserted}件をDBに挿入/更新\n`);

// 3. 日別例外取得・移行（全期間）
console.log("3. 日別例外を取得中...");
const overridesRes = await fetchFromGAS("getScheduleRange", {
  start: "2020-01-01",
  end: "2030-12-31",
});

const overrides = overridesRes.overrides || [];
console.log(`   取得件数: ${overrides.length}件`);

let overridesInserted = 0;
for (const ov of overrides) {
  if (!ov.doctor_id || !ov.date) continue;

  // 時間を "HH:MM" 形式に正規化
  const startTime = normalizeTime(ov.start_time);
  const endTime = normalizeTime(ov.end_time);

  const { error } = await supabase.from("doctor_date_overrides").upsert(
    {
      doctor_id: ov.doctor_id,
      date: ov.date,
      type: ov.type || "modify",
      start_time: startTime || null,
      end_time: endTime || null,
      slot_minutes: ov.slot_minutes === "" ? null : (Number(ov.slot_minutes) || null),
      capacity: ov.capacity === "" ? null : (Number(ov.capacity) || null),
      memo: ov.memo || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "doctor_id,date" }
  );

  if (error) {
    console.error(`   ❌ ${ov.doctor_id} ${ov.date}:`, error.message);
  } else {
    overridesInserted++;
  }
}
console.log(`   → ${overridesInserted}件をDBに挿入/更新\n`);

// 結果確認
console.log("=== 移行結果 ===");
const { count: docCount } = await supabase
  .from("doctors")
  .select("*", { count: "exact", head: true });
const { count: ruleCount } = await supabase
  .from("doctor_weekly_rules")
  .select("*", { count: "exact", head: true });
const { count: ovCount } = await supabase
  .from("doctor_date_overrides")
  .select("*", { count: "exact", head: true });

console.log(`doctors: ${docCount}件`);
console.log(`doctor_weekly_rules: ${ruleCount}件`);
console.log(`doctor_date_overrides: ${ovCount}件`);
console.log("\n移行完了!");

// 時間文字列を "HH:MM" 形式に正規化
function normalizeTime(v) {
  if (v === null || v === undefined || v === "") return null;

  const s = String(v).trim();
  // "HH:MM" または "H:MM" 形式を抽出
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const h = m[1].padStart(2, "0");
    const min = m[2];
    return `${h}:${min}`;
  }
  return null;
}
