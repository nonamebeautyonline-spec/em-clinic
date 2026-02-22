// RPC関数の型修正を本番DBにデプロイ
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const refId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// access token
const { homedir } = require("os");
const { join } = require("path");
const tokenPaths = [
  join(homedir(), ".supabase", "access-token"),
  join(homedir(), ".config", "supabase", "access-token"),
];
let accessToken;
for (const p of tokenPaths) {
  if (fs.existsSync(p)) {
    accessToken = fs.readFileSync(p, "utf-8").trim();
    break;
  }
}
if (!accessToken) {
  console.error("Supabase access token not found. Trying service role key via REST...");
  // service role key で直接SQLを実行するfallback
  deployViaServiceRole();
} else {
  deployViaManagementAPI(accessToken, refId);
}

async function deployViaManagementAPI(token, projectRef) {
  const files = [
    path.resolve(__dirname, "../supabase/migrations/20260217_create_reservation_atomic.sql"),
    path.resolve(__dirname, "../supabase/migrations/20260218_update_reservation_atomic.sql"),
  ];

  for (const file of files) {
    const sql = fs.readFileSync(file, "utf-8");
    console.log(`Deploying ${path.basename(file)}...`);

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await res.text();
    if (res.ok) {
      console.log(`  OK (${res.status})`);
    } else {
      console.error(`  FAILED (${res.status}): ${text}`);
    }
  }
}

async function deployViaServiceRole() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const files = [
    path.resolve(__dirname, "../supabase/migrations/20260217_create_reservation_atomic.sql"),
    path.resolve(__dirname, "../supabase/migrations/20260218_update_reservation_atomic.sql"),
  ];

  for (const file of files) {
    const sql = fs.readFileSync(file, "utf-8");
    console.log(`Deploying ${path.basename(file)} via exec_sql...`);
    const { data, error } = await sb.rpc("exec_sql", { sql });
    if (error) {
      console.error(`  FAILED: ${error.message}`);
    } else {
      console.log(`  OK`);
    }
  }
}
