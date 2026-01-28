// sync-call-status-to-supabase.mjs
// GASシートのcall_status（不通データ）をSupabaseに同期

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;

if (!supabaseUrl || !supabaseKey || !GAS_MYPAGE_URL) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Syncing call_status from GAS to Supabase ===\n");

try {
  // 1. GASから全データを取得
  console.log("Fetching data from GAS...");
  const response = await fetch(`${GAS_MYPAGE_URL}?type=get_dashboard&full=1`, {
    method: "GET",
  });

  if (!response.ok) {
    console.error("❌ GAS request failed:", response.status);
    process.exit(1);
  }

  const gasData = await response.json();

  if (!Array.isArray(gasData)) {
    console.error("❌ Unexpected GAS response format");
    process.exit(1);
  }

  console.log(`Retrieved ${gasData.length} records from GAS\n`);

  // 2. call_statusが存在するレコードを抽出
  const recordsWithCallStatus = gasData.filter(row => {
    const callStatus = row.call_status || "";
    return callStatus && callStatus !== "";
  });

  console.log(`Found ${recordsWithCallStatus.length} records with call_status\n`);

  if (recordsWithCallStatus.length === 0) {
    console.log("✓ No records to sync");
    process.exit(0);
  }

  // 3. Supabaseに同期
  let updated = 0;
  let failed = 0;

  for (const row of recordsWithCallStatus) {
    const patientId = String(row.patient_id || row.Patient_ID || "").trim();
    const callStatus = row.call_status || "";
    const callStatusUpdatedAt = row.call_status_updated_at || null;

    if (!patientId) {
      console.log(`⚠ Skipping record without patient_id`);
      failed++;
      continue;
    }

    try {
      const { error } = await supabase
        .from("intake")
        .update({
          call_status: callStatus,
          call_status_updated_at: callStatusUpdatedAt,
        })
        .eq("patient_id", patientId);

      if (error) {
        console.error(`❌ Failed to update patient_id=${patientId}:`, error.message);
        failed++;
      } else {
        console.log(`✓ Updated patient_id=${patientId}, call_status=${callStatus}`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ Error updating patient_id=${patientId}:`, err.message);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${recordsWithCallStatus.length}`);

} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
