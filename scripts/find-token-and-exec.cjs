const fs = require("fs");
const path = require("path");
const os = require("os");

// Read env
const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return;
  const key = trimmed.substring(0, idx).trim();
  let value = trimmed.substring(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  envVars[key] = value;
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const refId = url.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Find access token
const home = os.homedir();
const searchPaths = [
  path.join(home, "Library", "Application Support", "supabase", "access-token"),
  path.join(home, ".supabase", "access-token"),
  path.join(home, ".config", "supabase", "access-token"),
];

let token;
for (const p of searchPaths) {
  if (fs.existsSync(p)) { token = fs.readFileSync(p, "utf-8").trim(); console.log("Token at:", p); break; }
}

if (!token) {
  // Try settings.json
  const settingsPath = path.join(home, "Library", "Application Support", "supabase", "settings.json");
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      if (settings.access_token) token = settings.access_token;
      if (!token && settings.profiles) {
        for (const [name, profile] of Object.entries(settings.profiles)) {
          if (profile.access_token) { token = profile.access_token; console.log("Token from profile:", name); break; }
        }
      }
    } catch (e) {}
  }
}

if (!token) {
  // Try credentials file
  const credPaths = [
    path.join(home, "Library", "Application Support", "supabase"),
    path.join(home, ".supabase"),
    path.join(home, ".config", "supabase"),
  ];
  for (const dir of credPaths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log("Files in", dir, ":", files);
      for (const f of files) {
        if (f.includes("token") || f.includes("cred") || f.endsWith(".json")) {
          const content = fs.readFileSync(path.join(dir, f), "utf-8").trim();
          if (content.startsWith("sbp_")) { token = content; console.log("Token from:", f); break; }
          try {
            const json = JSON.parse(content);
            if (json.access_token) { token = json.access_token; console.log("Token from JSON:", f); break; }
          } catch (e) {}
        }
      }
      if (token) break;
    }
  }
}

if (!token) {
  console.error("No access token found.");
  process.exit(1);
}

// Execute SQL
const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/20260215_create_products_and_settings.sql"), "utf-8");
console.log("Executing SQL on project:", refId);

fetch(`https://api.supabase.com/v1/projects/${refId}/database/query`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
}).then(async (res) => {
  const text = await res.text();
  console.log("Status:", res.status);
  try {
    const json = JSON.parse(text);
    console.log("Result:", JSON.stringify(json, null, 2));
  } catch {
    console.log("Response:", text.substring(0, 500));
  }
}).catch(console.error);
