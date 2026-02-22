// Supabase Management API を使ってSQLを直接実行
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const refId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// Supabase Access Token (from CLI login)
import { execSync } from "child_process";

let accessToken;
try {
  // supabase CLIの認証情報からアクセストークンを取得
  const tokenOutput = execSync("npx supabase projects list --output json 2>/dev/null", { encoding: "utf-8", timeout: 15000 });
  // CLIが認証済みなら、Management APIを直接叩ける
} catch (e) {}

// Management API経由でSQL実行
// https://supabase.com/docs/reference/management-api/query-sql
const sql = process.argv[2] || "SELECT 1;";
console.log("実行SQL:", sql);
console.log("Project:", refId);

// supabase CLI のトークンファイルから読む
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

const tokenPaths = [
  join(homedir(), ".supabase", "access-token"),
  join(homedir(), ".config", "supabase", "access-token"),
];

for (const p of tokenPaths) {
  if (existsSync(p)) {
    accessToken = readFileSync(p, "utf-8").trim();
    console.log("Token found at:", p);
    break;
  }
}

if (!accessToken) {
  console.error("Supabase access token not found. Run: npx supabase login");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${refId}/database/query`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log("Status:", res.status);
try {
  const json = JSON.parse(text);
  console.log("Result:", JSON.stringify(json, null, 2));
} catch {
  console.log("Response:", text);
}
