// 不一致の中身を確認（先頭500件を対象に詳細出力）
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envFile = readFileSync(envPath, "utf-8");
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = process.env.GAS_MYPAGE_URL;

// DB全件取得
const dbMap = new Map();
let page = 0;
while (true) {
  const { data } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .not("patient_id", "is", null)
    .order("patient_id", { ascending: true })
    .range(page * 1000, (page + 1) * 1000 - 1);
  if (!data || data.length === 0) break;
  for (const row of data) {
    if (!dbMap.has(row.patient_id)) {
      dbMap.set(row.patient_id, { patient_name: row.patient_name || "", line_id: row.line_id || "" });
    }
  }
  page++;
  if (data.length < 1000) break;
}

const allPids = Array.from(dbMap.keys()).slice(0, 500);
console.log(`対象: ${allPids.length}件\n`);

let nameOnly = 0;
let lineOnly = 0;
let both = 0;

for (let i = 0; i < allPids.length; i += 10) {
  const batch = allPids.slice(i, i + 10);
  const results = await Promise.all(batch.map(async (pid) => {
    const db = dbMap.get(pid);
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`, { signal: controller.signal });
      clearTimeout(t);
      const json = await res.json();
      const gas = json.patient || {};
      if (!gas.id) return null;

      const nameOk = (gas.displayName || "") === (db.patient_name || "");
      const lineOk = (gas.line_user_id || "") === (db.line_id || "");

      if (!nameOk || !lineOk) {
        return { pid, gasName: gas.displayName || "", dbName: db.patient_name || "", gasLine: gas.line_user_id || "", dbLine: db.line_id || "", nameOk, lineOk };
      }
    } catch { }
    return null;
  }));

  for (const r of results) {
    if (!r) continue;
    if (!r.nameOk && !r.lineOk) both++;
    else if (!r.nameOk) nameOnly++;
    else lineOnly++;

    console.log(`PID: ${r.pid}`);
    if (!r.nameOk) console.log(`  名前不一致: GAS="${r.gasName}" DB="${r.dbName}"`);
    if (!r.lineOk) console.log(`  LINE不一致: GAS="${r.gasLine}" DB="${r.dbLine}"`);
    console.log();
  }
  await new Promise(r => setTimeout(r, 300));
}

console.log(`=== 集計 ===`);
console.log(`名前のみ不一致: ${nameOnly}`);
console.log(`LINEのみ不一致: ${lineOnly}`);
console.log(`両方不一致:     ${both}`);
