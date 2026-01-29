// check-empty-names.mjs
// intakeテーブルで氏名が空のレコードを確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Checking for empty patient_name in intake table ===\n");

try {
  const { data, error } = await supabase
    .from("intake")
    .select("id, reserve_id, patient_id, patient_name, reserved_date")
    .or("patient_name.is.null,patient_name.eq.")
    .order("reserved_date", { ascending: false });

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log(`Found ${data.length} records with empty patient_name\n`);

  if (data.length > 0) {
    console.log("=== Records with empty patient_name ===");
    data.forEach((r, i) => {
      console.log(`${i + 1}. ${r.reserve_id} (patient_id: ${r.patient_id}) - ${r.reserved_date || "no date"}`);
    });
  } else {
    console.log("✓ All records have patient_name!");
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
