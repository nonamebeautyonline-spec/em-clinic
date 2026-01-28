// sync-names-to-intake.mjs
// reservationsテーブルからintakeテーブルに氏名をコピー

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Syncing patient names from reservations to intake ===\n");

try {
  // 1. intakeテーブルから氏名が空のレコードを取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("id, reserve_id, patient_id, patient_name, answers")
    .or("patient_name.is.null,patient_name.eq.")
    .not("reserve_id", "is", null);

  if (intakeError) {
    console.error("❌ Error fetching intake:", intakeError);
    process.exit(1);
  }

  console.log(`Found ${intakeData.length} intake records with missing patient_name\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const intake of intakeData) {
    // 2. reservationsテーブルから氏名を取得
    const { data: resData, error: resError } = await supabase
      .from("reservations")
      .select("patient_name")
      .eq("reserve_id", intake.reserve_id)
      .single();

    if (resError || !resData) {
      console.log(`✗ ${intake.reserve_id}: Not found in reservations`);
      notFound++;
      continue;
    }

    if (!resData.patient_name) {
      console.log(`✗ ${intake.reserve_id}: No patient_name in reservations either`);
      notFound++;
      continue;
    }

    // 3. intakeテーブルを更新
    const { error: updateError } = await supabase
      .from("intake")
      .update({
        patient_name: resData.patient_name,
        // answersのnameも更新
        answers: {
          ...intake.answers,
          name: resData.patient_name,
          "氏名": resData.patient_name,
        }
      })
      .eq("id", intake.id);

    if (updateError) {
      console.log(`✗ ${intake.reserve_id}: Update failed - ${updateError.message}`);
      errors++;
      continue;
    }

    console.log(`✓ ${intake.reserve_id}: Updated to "${resData.patient_name}"`);
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Not found in reservations: ${notFound}`);
  console.log(`  - Errors: ${errors}`);
} catch (err) {
  console.error("❌ Error:", err.message);
}
