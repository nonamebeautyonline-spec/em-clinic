// GAS vs DB 全件突き合わせ（1000件制限対応）
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
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

// 1. DBから全patient_idとpatient_nameを取得（ページネーション）
console.log("=== DB全件取得中... ===");
const dbMap = new Map(); // patient_id -> { patient_name, line_id }
let page = 0;
const limit = 1000;

while (true) {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, patient_name, line_id")
    .not("patient_id", "is", null)
    .order("patient_id", { ascending: true })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error("DB error:", error.message);
    break;
  }
  if (!data || data.length === 0) break;

  for (const row of data) {
    // 同じpatient_idで複数行ある場合、最初のものを使う
    if (!dbMap.has(row.patient_id)) {
      dbMap.set(row.patient_id, {
        patient_name: row.patient_name || "",
        line_id: row.line_id || "",
      });
    }
  }

  console.log(`  DB page ${page + 1}: ${data.length}件 (累計 ${dbMap.size} patients)`);
  page++;
  if (data.length < limit) break;
}

console.log(`\nDB合計: ${dbMap.size} patients\n`);

// 2. GASからランダムに50件サンプリングして比較
const allPids = Array.from(dbMap.keys());
const sampleSize = Math.min(50, allPids.length);

// 均等にサンプリング（先頭・中間・末尾をカバー）
const samplePids = [];
for (let i = 0; i < sampleSize; i++) {
  const idx = Math.floor(i * allPids.length / sampleSize);
  samplePids.push(allPids[idx]);
}

console.log(`=== GAS比較 (${samplePids.length}件サンプル) ===\n`);

let matchCount = 0;
let mismatchCount = 0;
let gasErrorCount = 0;
const mismatches = [];

for (let i = 0; i < samplePids.length; i++) {
  const pid = samplePids[i];
  const db = dbMap.get(pid);

  try {
    const url = `${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`;
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();
    const gas = json.patient || {};

    const nameOk = (gas.displayName || "") === (db.patient_name || "");
    const lineOk = (gas.line_user_id || "") === (db.line_id || "");

    if (nameOk && lineOk) {
      matchCount++;
      process.stdout.write(".");
    } else {
      mismatchCount++;
      const detail = {
        pid,
        gasName: gas.displayName || "",
        dbName: db.patient_name || "",
        gasLine: gas.line_user_id || "",
        dbLine: db.line_id || "",
        nameOk,
        lineOk,
      };
      mismatches.push(detail);
      process.stdout.write("X");
    }
  } catch (e) {
    gasErrorCount++;
    process.stdout.write("E");
  }

  // GASレート制限回避
  if ((i + 1) % 10 === 0) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

console.log("\n\n=== 結果 ===");
console.log(`一致: ${matchCount}/${samplePids.length}`);
console.log(`不一致: ${mismatchCount}`);
console.log(`GASエラー: ${gasErrorCount}`);

if (mismatches.length > 0) {
  console.log("\n=== 不一致の詳細 ===");
  for (const m of mismatches) {
    console.log(`PID: ${m.pid}`);
    if (!m.nameOk) console.log(`  名前: GAS="${m.gasName}" vs DB="${m.dbName}"`);
    if (!m.lineOk) console.log(`  LINE: GAS="${m.gasLine}" vs DB="${m.dbLine}"`);
  }
}

// 3. DBにpatient_nameがないintake行があるか確認
let noNameCount = 0;
page = 0;
while (true) {
  const { data } = await supabase
    .from("intake")
    .select("patient_id, patient_name")
    .is("patient_name", null)
    .range(page * limit, (page + 1) * limit - 1);

  if (!data || data.length === 0) break;
  noNameCount += data.length;
  page++;
  if (data.length < limit) break;
}

console.log(`\n=== DBチェック ===`);
console.log(`patient_name が NULL の intake行: ${noNameCount}件`);
