// GAS vs DB 全件突き合わせ（並列処理・改良版）
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
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAS_URL = process.env.GAS_MYPAGE_URL;
const CONCURRENCY = 10;

// 1. DB全件取得
console.log("=== DB全件取得中... ===");
const dbMap = new Map();
let page = 0;
const limit = 1000;

while (true) {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .not("patient_id", "is", null)
    .order("patient_id", { ascending: true })
    .range(page * limit, (page + 1) * limit - 1);

  if (error || !data || data.length === 0) break;

  for (const row of data) {
    if (!dbMap.has(row.patient_id)) {
      dbMap.set(row.patient_id, {
        patient_name: row.patient_name || "",
        line_id: row.line_id || "",
      });
    }
  }
  page++;
  if (data.length < limit) break;
}

const allPids = Array.from(dbMap.keys());
console.log(`DB合計: ${allPids.length} patients\n`);

// 2. GASを並列で全件比較
let matchCount = 0;
let mismatchCount = 0;
let gasErrorCount = 0;
let gasNotFoundCount = 0;
const mismatches = [];
let processed = 0;

async function checkOne(pid) {
  const db = dbMap.get(pid);
  try {
    const url = `${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    const json = await res.json();
    const gas = json.patient || {};

    if (!gas.id && !gas.displayName) {
      gasNotFoundCount++;
      return;
    }

    const nameOk = (gas.displayName || "") === (db.patient_name || "");
    const lineOk = (gas.line_user_id || "") === (db.line_id || "");

    if (nameOk && lineOk) {
      matchCount++;
    } else {
      mismatchCount++;
      mismatches.push({
        pid,
        gasName: gas.displayName || "",
        dbName: db.patient_name || "",
        gasLine: gas.line_user_id || "",
        dbLine: db.line_id || "",
        nameOk,
        lineOk,
      });
    }
  } catch (e) {
    gasErrorCount++;
  }

  processed++;
  if (processed % 50 === 0) {
    console.log(`  進捗: ${processed}/${allPids.length} (一致=${matchCount}, 不一致=${mismatchCount}, GAS未登録=${gasNotFoundCount}, エラー=${gasErrorCount})`);
  }
}

console.log(`=== GAS全件比較開始 (${allPids.length}件, ${CONCURRENCY}並列) ===\n`);
const startTime = Date.now();

for (let i = 0; i < allPids.length; i += CONCURRENCY) {
  const batch = allPids.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(pid => checkOne(pid)));
  await new Promise(r => setTimeout(r, 300));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n=== 最終結果 (${elapsed}秒) ===`);
console.log(`全患者数: ${allPids.length}`);
console.log(`一致:       ${matchCount}`);
console.log(`不一致:     ${mismatchCount}`);
console.log(`GAS未登録:  ${gasNotFoundCount}`);
console.log(`GASエラー:  ${gasErrorCount}`);

if (mismatches.length > 0) {
  console.log(`\n=== 不一致の詳細 ===`);
  for (const m of mismatches) {
    console.log(`PID: ${m.pid}`);
    if (!m.nameOk) console.log(`  名前: GAS="${m.gasName}" vs DB="${m.dbName}"`);
    if (!m.lineOk) console.log(`  LINE: GAS="${m.gasLine}" vs DB="${m.dbLine}"`);
  }
} else {
  console.log("\n不一致なし！全件完全一致です。");
}
