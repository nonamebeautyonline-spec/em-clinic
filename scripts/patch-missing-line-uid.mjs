// GASにあるLINE UIDをDBに反映するパッチスクリプト
// 対象: GASにline_user_idがあるがDBのintake.line_idがNULLの患者
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = readFileSync(join(__dirname, "../.env.local"), "utf-8");
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
const CONCURRENCY = 10;

// 1. DBから line_id が空の患者を取得
console.log("=== DBからLINE UID未設定の患者を取得中... ===");
const missingLineId = [];
let page = 0;

while (true) {
  const { data } = await supabase
    .from("intake")
    .select("patient_id, line_id")
    .is("line_id", null)
    .not("patient_id", "is", null)
    .order("patient_id", { ascending: true })
    .range(page * 1000, (page + 1) * 1000 - 1);

  if (!data || data.length === 0) break;
  for (const row of data) {
    missingLineId.push(row.patient_id);
  }
  page++;
  if (data.length < 1000) break;
}

console.log(`LINE UID未設定: ${missingLineId.length}人\n`);

if (missingLineId.length === 0) {
  console.log("パッチ不要です。");
  process.exit(0);
}

// 2. GASから各患者のLINE UIDを取得→DBに書き込み
let patchedCount = 0;
let skippedCount = 0;
let errorCount = 0;
let processed = 0;

async function patchOne(pid) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const json = await res.json();
    const gasLineId = (json.patient?.line_user_id || "").trim();

    if (!gasLineId || gasLineId.startsWith("U_TEST")) {
      skippedCount++;
      return;
    }

    // DBに書き込み
    const { error } = await supabase
      .from("intake")
      .update({ line_id: gasLineId })
      .eq("patient_id", pid);

    if (error) {
      console.error(`  [ERROR] ${pid}: ${error.message}`);
      errorCount++;
    } else {
      patchedCount++;
    }
  } catch (e) {
    errorCount++;
  }

  processed++;
  if (processed % 20 === 0) {
    console.log(`  進捗: ${processed}/${missingLineId.length} (パッチ=${patchedCount}, スキップ=${skippedCount}, エラー=${errorCount})`);
  }
}

console.log(`=== GAS→DBパッチ開始 (${missingLineId.length}件, ${CONCURRENCY}並列) ===\n`);

for (let i = 0; i < missingLineId.length; i += CONCURRENCY) {
  const batch = missingLineId.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(pid => patchOne(pid)));
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n=== 完了 ===`);
console.log(`パッチ済み: ${patchedCount}`);
console.log(`スキップ（GASにもない/テスト）: ${skippedCount}`);
console.log(`エラー: ${errorCount}`);
