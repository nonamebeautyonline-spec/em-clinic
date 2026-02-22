// RPC関数デプロイスクリプト
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";

// .env.local 読み込み
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
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
const refId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// access token
const tokenPaths = [
  join(homedir(), ".supabase", "access-token"),
  join(homedir(), ".config", "supabase", "access-token"),
];
let accessToken;
for (const p of tokenPaths) {
  if (existsSync(p)) {
    accessToken = readFileSync(p, "utf-8").trim();
    break;
  }
}
if (!accessToken) {
  console.error("Supabase access token not found");
  process.exit(1);
}

// SQL読み込み
const sql = readFileSync(resolve(process.cwd(), "migrations/create_reservation_atomic.sql"), "utf-8");
console.log("Project:", refId);
console.log("SQL length:", sql.length, "chars");

const res = await fetch(`https://api.supabase.com/v1/projects/${refId}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log("HTTP Status:", res.status);
try {
  const json = JSON.parse(text);
  console.log("Result:", JSON.stringify(json, null, 2));
} catch {
  console.log("Response:", text);
}
