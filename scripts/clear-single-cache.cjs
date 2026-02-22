const { readFileSync } = require("fs");
const { resolve } = require("path");
const { Redis } = require("@upstash/redis");

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const [key, ...vp] = t.split("=");
  if (key && vp.length > 0) {
    let v = vp.join("=").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envVars[key.trim()] = v;
  }
});

const redis = new Redis({ url: envVars.KV_REST_API_URL, token: envVars.KV_REST_API_TOKEN });
const pid = process.argv[2];
if (!pid) { console.error("Usage: node clear-single-cache.cjs <patient_id>"); process.exit(1); }
redis.del("dashboard:" + pid).then(r => console.log("del dashboard:" + pid + " →", r));
