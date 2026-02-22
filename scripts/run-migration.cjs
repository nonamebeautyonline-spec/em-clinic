// scripts/run-migration.cjs — マイグレーション実行スクリプト
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return;
  const key = trimmed.substring(0, idx).trim();
  let value = trimmed.substring(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  envVars[key] = value;
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Create products table
  console.log("Creating products table...");
  const { error: e1 } = await supabase.rpc("exec_sql", {
    sql: `CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      drug_name TEXT NOT NULL DEFAULT 'マンジャロ',
      dosage TEXT,
      duration_months INT,
      quantity INT,
      price INT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      category TEXT DEFAULT 'injection',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(tenant_id, code)
    );`
  });

  if (e1) {
    // rpc may not exist, try via REST
    console.log("rpc not available, trying direct table creation via REST...");

    // Try inserting directly - if table exists it will work, if not we need another approach
    const { error: checkErr } = await supabase.from("products").select("id").limit(1);
    if (checkErr && checkErr.message.includes("does not exist")) {
      console.error("products table does not exist. Please run the SQL migration manually:");
      console.error("SQL file: supabase/migrations/20260210_create_products_and_settings.sql");
      console.error("\nTo run manually, go to Supabase Dashboard > SQL Editor and paste the migration SQL.");
      process.exit(1);
    }
    console.log("products table already exists or accessible.");
  } else {
    console.log("products table created.");
  }

  // 2. Create tenant_settings table (same approach)
  console.log("Creating tenant_settings table...");
  const { error: e2 } = await supabase.rpc("exec_sql", {
    sql: `CREATE TABLE IF NOT EXISTS tenant_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id UUID,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(tenant_id, category, key)
    );`
  });

  if (e2) {
    const { error: checkErr } = await supabase.from("tenant_settings").select("id").limit(1);
    if (checkErr && checkErr.message.includes("does not exist")) {
      console.error("tenant_settings table does not exist. Please run migration manually.");
      process.exit(1);
    }
    console.log("tenant_settings table already exists or accessible.");
  } else {
    console.log("tenant_settings table created.");
  }

  // 3. Seed products (check if already seeded)
  console.log("Checking existing products...");
  const { data: existing, error: existErr } = await supabase.from("products").select("code");
  if (existErr) {
    console.error("Failed to read products:", existErr.message);
    process.exit(1);
  }

  const existingCodes = new Set((existing || []).map((p) => p.code));
  console.log(`Found ${existingCodes.size} existing products.`);

  const seeds = [
    { code: "MJL_2.5mg_1m", title: "マンジャロ 2.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1, quantity: 4, price: 13000, sort_order: 1, category: "injection" },
    { code: "MJL_2.5mg_2m", title: "マンジャロ 2.5mg 2ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 2, quantity: 8, price: 25500, sort_order: 2, category: "injection" },
    { code: "MJL_2.5mg_3m", title: "マンジャロ 2.5mg 3ヶ月", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 3, quantity: 12, price: 35000, sort_order: 3, category: "injection" },
    { code: "MJL_5mg_1m", title: "マンジャロ 5mg 1ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 1, quantity: 4, price: 22850, sort_order: 4, category: "injection" },
    { code: "MJL_5mg_2m", title: "マンジャロ 5mg 2ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 2, quantity: 8, price: 45500, sort_order: 5, category: "injection" },
    { code: "MJL_5mg_3m", title: "マンジャロ 5mg 3ヶ月", drug_name: "マンジャロ", dosage: "5mg", duration_months: 3, quantity: 12, price: 63000, sort_order: 6, category: "injection" },
    { code: "MJL_7.5mg_1m", title: "マンジャロ 7.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 1, quantity: 4, price: 34000, sort_order: 7, category: "injection" },
    { code: "MJL_7.5mg_2m", title: "マンジャロ 7.5mg 2ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 2, quantity: 8, price: 65000, sort_order: 8, category: "injection" },
    { code: "MJL_7.5mg_3m", title: "マンジャロ 7.5mg 3ヶ月", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 3, quantity: 12, price: 96000, sort_order: 9, category: "injection" },
    { code: "MJL_10mg_1m", title: "マンジャロ 10mg 1ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 1, quantity: 4, price: 35000, sort_order: 10, category: "injection" },
    { code: "MJL_10mg_2m", title: "マンジャロ 10mg 2ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 2, quantity: 8, price: 70000, sort_order: 11, category: "injection" },
    { code: "MJL_10mg_3m", title: "マンジャロ 10mg 3ヶ月", drug_name: "マンジャロ", dosage: "10mg", duration_months: 3, quantity: 12, price: 105000, sort_order: 12, category: "injection" },
  ];

  const toInsert = seeds.filter((s) => !existingCodes.has(s.code));
  if (toInsert.length === 0) {
    console.log("All products already seeded. Skipping.");
  } else {
    console.log(`Inserting ${toInsert.length} new products...`);
    const { error: insertErr } = await supabase.from("products").insert(toInsert);
    if (insertErr) {
      console.error("Insert error:", insertErr.message);
    } else {
      console.log(`${toInsert.length} products inserted.`);
    }
  }

  console.log("\nDone!");
}

run().catch(console.error);
