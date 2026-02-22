// scripts/sync-lstep-marks.mjs
// Lステップの対応マークCSVをDBのpatient_marksに同期するスクリプト
//
// 使い方:
//   node scripts/sync-lstep-marks.mjs path/to/lstep-export.csv
//
// CSV形式（Lステップ エクスポート）:
//   "登録ID","",""
//   "ID","表示名","対応マーク"
//   "227427247","名前","処方ずみ"
//
// ※ "未対応" はスキップ（Lオペのデフォルト）

import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

// ── .env.local パース ──
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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local にありません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── CSV読み込み ──
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("使い方: node scripts/sync-lstep-marks.mjs <CSVファイルパス>");
  process.exit(1);
}

// Shift-JIS → UTF-8 変換
const absPath = resolve(process.cwd(), csvPath);
let csvRaw;
try {
  csvRaw = execSync(`iconv -f SHIFT-JIS -t UTF-8 -c "${absPath}"`).toString();
} catch {
  csvRaw = readFileSync(absPath, "utf-8");
}
const lines = csvRaw.split("\n").map(l => l.replace(/\r$/, ""));

// クォート付きCSVをパース
function parseCSVLine(line) {
  const cols = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  cols.push(current.trim());
  return cols;
}

// データ行（3行目以降）: [LステップID, 表示名, 対応マーク]
const dataRows = [];
for (let i = 2; i < lines.length; i++) {
  if (!lines[i]?.trim()) continue;
  const cols = parseCSVLine(lines[i]);
  if (!cols[0]?.trim()) continue;
  dataRows.push({
    lstepId: cols[0].trim(),
    displayName: cols[1]?.trim() || "",
    markLabel: cols[2]?.trim() || "",
  });
}

// 「未対応」をフィルタ除外
const targetRows = dataRows.filter(r => r.markLabel && r.markLabel !== "未対応");

console.log(`\n── Lステップ 対応マーク同期 ──`);
console.log(`CSV全行: ${dataRows.length}件`);
console.log(`対象（未対応以外）: ${targetRows.length}件`);

// 対象マークラベル一覧
const uniqueLabels = [...new Set(targetRows.map(r => r.markLabel))];
console.log(`同期するマーク: ${uniqueLabels.join(", ")}`);

// ── DB: mark_definitions からラベル → value のマップを取得 ──
const { data: markDefs, error: markErr } = await supabase
  .from("mark_definitions")
  .select("value, label");

if (markErr) {
  console.error("mark_definitions 取得エラー:", markErr.message);
  process.exit(1);
}

const labelToValue = {};
for (const md of markDefs) {
  labelToValue[md.label] = md.value;
}

// CSVマーク名 → DB value のマッチング確認
const markMapping = {};
for (const label of uniqueLabels) {
  const value = labelToValue[label];
  if (value) {
    markMapping[label] = value;
    console.log(`  ✓ "${label}" → value: "${value}"`);
  } else {
    console.error(`  ✗ "${label}" → mark_definitionsにありません！`);
    console.error(`    DB にあるマーク: ${markDefs.map(m => m.label).join(", ")}`);
    process.exit(1);
  }
}

// ── ページネーション付き全件取得 ──
async function fetchAll(table, columns) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`${table} 取得エラー (offset=${from}):`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ── answerer_id → patient_id マッピング構築 ──
const answerers = await fetchAll("answerers", "patient_id, answerer_id");
const intakeRows = await fetchAll("intake", "patient_id, answerer_id");

const lstepIdToPatientId = {};

for (const a of answerers) {
  if (a.answerer_id) {
    lstepIdToPatientId[a.answerer_id] = a.patient_id;
  }
}

for (const r of intakeRows) {
  if (r.answerer_id && !lstepIdToPatientId[r.answerer_id]) {
    lstepIdToPatientId[r.answerer_id] = r.patient_id;
  }
}

console.log(`\nanswerer_id マッピング: ${Object.keys(lstepIdToPatientId).length}件`);

// ── 同期実行 ──
let matched = 0;
let notFound = 0;
let upserted = 0;
let errors = 0;
const notFoundList = [];
const upsertedList = [];

for (const row of targetRows) {
  const patientId = lstepIdToPatientId[row.lstepId];

  if (!patientId) {
    notFound++;
    notFoundList.push(row);
    continue;
  }

  matched++;
  const markValue = markMapping[row.markLabel];

  const { error: upsertErr } = await supabase
    .from("patient_marks")
    .upsert(
      {
        patient_id: patientId,
        mark: markValue,
        updated_at: new Date().toISOString(),
        updated_by: "lstep_migration",
      },
      { onConflict: "patient_id" }
    );

  if (upsertErr) {
    console.error(`  ERROR: patient_id=${patientId}, mark="${row.markLabel}":`, upsertErr.message);
    errors++;
  } else {
    upserted++;
    upsertedList.push({ patientId, name: row.displayName, mark: row.markLabel });
  }
}

// ── 結果表示 ──
console.log(`\n══════════════════════════════`);
console.log(`  同期結果`);
console.log(`══════════════════════════════`);
console.log(`  対象行数:    ${targetRows.length}`);
console.log(`  マッチ:      ${matched}人`);
console.log(`  未マッチ:    ${notFound}人`);
console.log(`  upsert成功:  ${upserted}件`);
console.log(`  エラー:      ${errors}件`);
console.log(`══════════════════════════════\n`);

if (upsertedList.length > 0) {
  console.log(`── 同期済み一覧 ──`);
  for (const u of upsertedList) {
    console.log(`  ${u.patientId}  ${u.name}  → ${u.mark}`);
  }
}

if (notFoundList.length > 0) {
  console.log(`\n── 未マッチ一覧（answerer_idがDBに無い） ──`);
  for (const nf of notFoundList) {
    console.log(`  LステップID: ${nf.lstepId}  ${nf.displayName}  [${nf.markLabel}]`);
  }
}
