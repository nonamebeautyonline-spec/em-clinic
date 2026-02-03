import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function normalizeDate(dateValue) {
  if (!dateValue) return "";
  const str = String(dateValue);
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  if (str.match(/^\d{4}\/\d{2}\/\d{2}$/)) return str.replace(/\//g, "-");
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return "";
}

async function check1215Slot() {
  const today = "2026-02-03";
  const targetTime = "12:15";

  console.log("\n" + "=".repeat(70));
  console.log(`${today} ${targetTime}枠の予約を確認`);
  console.log("=".repeat(70));

  // 1. GASから取得
  console.log("\n[1/2] GASスプレッドシートから取得中...");
  const gasResponse = await fetch(GAS_RESERVATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "getAllReservations",
      date: today,
      token: ADMIN_TOKEN,
    }),
  });

  const gasData = await gasResponse.json();
  const gasSlot = gasData.reservations.filter(r => {
    const dateStr = normalizeDate(r.date || r.reserved_date);
    const timeStr = String(r.time || r.reserved_time).substring(0, 5);
    const isNotCanceled = r.status !== 'キャンセル' && r.status !== 'canceled';
    return dateStr === today && timeStr === targetTime && isNotCanceled;
  });

  console.log(`  GASの${targetTime}枠: ${gasSlot.length}件\n`);

  for (const r of gasSlot) {
    console.log(`  - ${r.patientName || r.patient_name || "(名前なし)"} (${r.patientId || r.patient_id})`);
    console.log(`    予約ID: ${r.reserveId || r.reserve_id}`);
  }

  // 2. Supabaseから取得
  console.log(`\n[2/2] Supabaseから取得中...`);
  const { data: supabaseSlot } = await supabase
    .from("reservations")
    .select("*")
    .eq("reserved_date", today)
    .eq("reserved_time", targetTime + ":00")
    .eq("status", "pending");

  console.log(`  Supabaseの${targetTime}枠: ${supabaseSlot?.length || 0}件\n`);

  for (const r of supabaseSlot || []) {
    console.log(`  - ${r.patient_name} (${r.patient_id})`);
    console.log(`    予約ID: ${r.reserve_id}`);

    // intakeのstatusも確認
    const { data: intake } = await supabase
      .from("intake")
      .select("status")
      .eq("patient_id", r.patient_id)
      .single();

    if (intake) {
      console.log(`    intake status: ${intake.status || "(未診察)"}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("結論:");
  console.log(`  GAS: ${gasSlot.length}件 / 定員2件`);
  console.log(`  Supabase: ${supabaseSlot?.length || 0}件`);

  if (gasSlot.length >= 2) {
    console.log("\n  ⚠️ GASの枠が満杯（2件）のため、追加できません");
    console.log("  診察完了済みの予約を削除するか、定員を増やす必要があります");
  }
  console.log("=".repeat(70));
}

check1215Slot().catch(console.error);
