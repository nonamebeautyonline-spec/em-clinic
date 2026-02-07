// scripts/migrate-lstep-tags.mjs
// LステップのタグCSVをDBのpatient_tagsに移行するスクリプト
//
// 使い方:
//   node scripts/migrate-lstep-tags.mjs path/to/lstep-export.csv
//
// CSV形式（Lステップ エクスポート）:
//   登録ID, 表示名, タグ_XXXX(処方ずみ), タグ_XXXX(個人情報提出ずみ), ...
//   ※ ヘッダー2行目にタグ名が入る想定
//   ※ 値: 1 = タグあり, 0 = タグなし

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
  console.error("使い方: node scripts/migrate-lstep-tags.mjs <CSVファイルパス>");
  process.exit(1);
}

// Shift-JIS → UTF-8 変換（iconv -c で不正バイトをスキップ）
const absPath = resolve(process.cwd(), csvPath);
let csvRaw;
try {
  csvRaw = execSync(`iconv -f SHIFT-JIS -t UTF-8 -c "${absPath}"`).toString();
} catch {
  // iconv失敗時はUTF-8として読み込み
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

// ヘッダー解析: 1行目=カラムキー, 2行目=タグ名
// "登録ID","","タグ_9220287","タグ_9212548"
// "ID","表示名","処方ずみ","個人情報提出ずみ"
const header1 = parseCSVLine(lines[0] || "");
const header2 = parseCSVLine(lines[1] || "");

// タグ列を特定（3列目以降）
const tagColumns = [];
for (let i = 2; i < header2.length; i++) {
  const tagName = header2[i]?.trim();
  if (tagName) {
    tagColumns.push({ colIndex: i, tagName });
  }
}

if (tagColumns.length === 0) {
  console.error("ERROR: タグ列が見つかりません。CSVの形式を確認してください。");
  console.error("header1:", header1);
  console.error("header2:", header2);
  process.exit(1);
}

console.log(`\n── Lステップ タグ移行 ──`);
console.log(`タグ列: ${tagColumns.map(t => t.tagName).join(", ")}`);

// データ行（3行目以降）
const dataRows = [];
for (let i = 2; i < lines.length; i++) {
  if (!lines[i]?.trim()) continue;
  const cols = parseCSVLine(lines[i]);
  if (!cols[0]?.trim()) continue;
  dataRows.push(cols);
}

console.log(`データ行: ${dataRows.length}件\n`);

// ── DB: tag_definitions からタグIDを取得 ──
const { data: tagDefs, error: tagErr } = await supabase
  .from("tag_definitions")
  .select("id, name");

if (tagErr) {
  console.error("tag_definitions 取得エラー:", tagErr.message);
  process.exit(1);
}

const tagNameToId = {};
for (const td of tagDefs) {
  tagNameToId[td.name] = td.id;
}

// CSVタグ名 → DB tag_id のマッピング
const tagMapping = [];
for (const tc of tagColumns) {
  const dbTagId = tagNameToId[tc.tagName];
  if (dbTagId) {
    tagMapping.push({ ...tc, dbTagId });
    console.log(`  ✓ "${tc.tagName}" → tag_id: ${dbTagId}`);
  } else {
    console.log(`  ✗ "${tc.tagName}" → DBにタグ定義が見つかりません（スキップ）`);
  }
}

if (tagMapping.length === 0) {
  console.error("\nERROR: マッチするタグ定義がありません。DBのtag_definitionsを確認してください。");
  process.exit(1);
}

// ── ページネーション付きで全件取得するヘルパー ──
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

// ── DB: answerers + intake から answerer_id → patient_id のマップを取得 ──
const answerers = await fetchAll("answerers", "patient_id, answerer_id");
const intakeRows = await fetchAll("intake", "patient_id, answerer_id");

const lstepIdToPatientId = {};

// answerers テーブルから
for (const a of answerers) {
  if (a.answerer_id) {
    lstepIdToPatientId[a.answerer_id] = a.patient_id;
  }
}
const fromAnswerers = Object.keys(lstepIdToPatientId).length;

// intake テーブルから（answersにない分を補完）
for (const r of intakeRows) {
  if (r.answerer_id && !lstepIdToPatientId[r.answerer_id]) {
    lstepIdToPatientId[r.answerer_id] = r.patient_id;
  }
}

console.log(`\nanswerers テーブル: ${answerers.length}件（answerer_id有り: ${fromAnswerers}件）`);
console.log(`intake テーブル: ${intakeRows.length}件`);
console.log(`answerer_id マッピング合計: ${Object.keys(lstepIdToPatientId).length}件`);

// ── 移行実行 ──
let matched = 0;
let notFound = 0;
let inserted = 0;
let skipped = 0;
let errors = 0;

const notFoundList = [];

for (const cols of dataRows) {
  const lstepId = cols[0]?.trim();
  const displayName = cols[1]?.trim() || "";
  const patientId = lstepIdToPatientId[lstepId];

  if (!patientId) {
    notFound++;
    notFoundList.push({ lstepId, displayName });
    continue;
  }

  matched++;

  for (const tm of tagMapping) {
    const val = cols[tm.colIndex]?.trim();
    if (val === "1") {
      const { error: upsertErr } = await supabase
        .from("patient_tags")
        .upsert(
          {
            patient_id: patientId,
            tag_id: tm.dbTagId,
            assigned_by: "lstep_migration",
          },
          { onConflict: "patient_id,tag_id" }
        );

      if (upsertErr) {
        console.error(`  ERROR: patient_id=${patientId}, tag="${tm.tagName}":`, upsertErr.message);
        errors++;
      } else {
        inserted++;
      }
    } else {
      skipped++;
    }
  }
}

// ── 結果表示 ──
console.log(`\n══════════════════════════════`);
console.log(`  移行結果`);
console.log(`══════════════════════════════`);
console.log(`  CSV行数:     ${dataRows.length}`);
console.log(`  マッチ:      ${matched}人`);
console.log(`  未マッチ:    ${notFound}人`);
console.log(`  タグ挿入:    ${inserted}件`);
console.log(`  タグ0スキップ: ${skipped}件`);
console.log(`  エラー:      ${errors}件`);
console.log(`══════════════════════════════\n`);

if (notFoundList.length > 0) {
  console.log(`── 未マッチ一覧（answerer_idがDBに無い） ──`);
  for (const nf of notFoundList) {
    console.log(`  LステップID: ${nf.lstepId}  表示名: ${nf.displayName}`);
  }
}
