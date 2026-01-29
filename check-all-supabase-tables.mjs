// check-all-supabase-tables.mjs
// Supabaseの全テーブルとレコード数を確認

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("=== Supabase Tables Overview ===\n");

const tables = [
  "intake",
  "reservations",
  "orders",
  "reorders",
  "shipping",
  "patients",
];

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      if (error.code === "42P01") {
        console.log(`❌ ${table}: Table does not exist`);
      } else {
        console.log(`❌ ${table}: Error - ${error.message}`);
      }
    } else {
      console.log(`✓ ${table}: ${count} records`);
    }
  } catch (err) {
    console.log(`❌ ${table}: ${err.message}`);
  }
}
