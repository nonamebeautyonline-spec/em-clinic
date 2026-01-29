// debug-tomorrow-reservations.mjs
// 全予約データをGASとSupabaseから取得して比較

import { readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // 前後のクォートを除去
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const GAS_INTAKE_URL = envVars.GAS_INTAKE_URL;
const GAS_INTAKE_LIST_URL = envVars.GAS_INTAKE_LIST_URL;
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 明日の日付を取得（YYYY-MM-DD形式）
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

console.log("=== 全予約データ調査 ===");
console.log(`明日の日付（参考）: ${tomorrowStr}\n`);

let gasAllRows = [];
let supabaseAllRows = [];

// 1. GASから全データ取得
console.log("[1] GASから全データ取得中...");
console.log(`URL: ${GAS_INTAKE_LIST_URL || GAS_INTAKE_URL}`);

try {
  const gasUrl = GAS_INTAKE_LIST_URL || GAS_INTAKE_URL;

  const response = await fetch(gasUrl, {
    method: "GET",
  });

  if (!response.ok) {
    console.log(`  ❌ エラー: HTTP ${response.status}`);
  } else {
    const data = await response.json();

    if (data.ok && Array.isArray(data.rows)) {
      gasAllRows = data.rows;
    } else if (Array.isArray(data)) {
      gasAllRows = data;
    }

    console.log(`  ✅ GASから取得: ${gasAllRows.length}件（全データ）\n`);

    // 日付ごとに集計
    const dateCount = {};
    gasAllRows.forEach(r => {
      const date = String(r.reserved_date || r["予約日"] || "").slice(0, 10);
      if (date) {
        dateCount[date] = (dateCount[date] || 0) + 1;
      }
    });

    console.log("  --- GAS 日付別件数 ---");
    Object.keys(dateCount).sort().forEach(date => {
      const mark = date === tomorrowStr ? " ← 明日" : "";
      console.log(`  ${date}: ${dateCount[date]}件${mark}`);
    });
    console.log("");

    // 明日のデータサンプル
    const tomorrowRows = gasAllRows.filter(r => {
      const date = String(r.reserved_date || r["予約日"] || "").slice(0, 10);
      return date === tomorrowStr;
    });

    if (tomorrowRows.length > 0) {
      console.log(`  --- GAS 明日のデータサンプル（最初の5件 / 全${tomorrowRows.length}件） ---`);
      tomorrowRows.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. PID: ${row.patient_id}, 名前: ${row.patient_name || row.name || row["氏名"]}, 時間: ${row.reserved_time || row["予約時間"]}, reserveId: ${row.reserveId || row.reserve_id}`);
      });
      console.log("");
    }
  }
} catch (e) {
  console.log(`  ❌ エラー: ${e.message}\n`);
}

// 2. Supabaseから全データ取得
if (SUPABASE_URL && SUPABASE_KEY) {
  console.log("[2] Supabaseから全データ取得中...");
  console.log(`URL: ${SUPABASE_URL}/rest/v1/intake`);

  try {
    // 全データ取得（reserved_dateがnullでないもの）
    // Rangeヘッダーで全件取得（0-9999 = 最大10000件）
    const url = `${SUPABASE_URL}/rest/v1/intake?reserved_date=not.is.null&order=reserved_date.asc,reserved_time.asc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Range": "0-9999",
      },
    });

    if (!response.ok) {
      console.log(`  ❌ エラー: HTTP ${response.status}`);
      const text = await response.text();
      console.log(`  詳細: ${text}\n`);
    } else {
      supabaseAllRows = await response.json();

      console.log(`  ✅ Supabaseから取得: ${supabaseAllRows.length}件（全データ）\n`);

      // 日付ごとに集計
      const dateCount = {};
      supabaseAllRows.forEach(r => {
        const date = String(r.reserved_date || "").slice(0, 10);
        if (date) {
          dateCount[date] = (dateCount[date] || 0) + 1;
        }
      });

      console.log("  --- Supabase 日付別件数 ---");
      Object.keys(dateCount).sort().forEach(date => {
        const mark = date === tomorrowStr ? " ← 明日" : "";
        console.log(`  ${date}: ${dateCount[date]}件${mark}`);
      });
      console.log("");

      // 明日のデータサンプル
      const tomorrowRows = supabaseAllRows.filter(r => {
        const date = String(r.reserved_date || "").slice(0, 10);
        return date === tomorrowStr;
      });

      if (tomorrowRows.length > 0) {
        console.log(`  --- Supabase 明日のデータサンプル（最初の5件 / 全${tomorrowRows.length}件） ---`);
        tomorrowRows.slice(0, 5).forEach((row, i) => {
          console.log(`  ${i + 1}. PID: ${row.patient_id}, 名前: ${row.patient_name}, 時間: ${row.reserved_time}, reserveId: ${row.reserve_id}`);
        });
        console.log("");
      }
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}\n`);
  }
} else {
  console.log("[2] Supabaseは設定されていません\n");
}

// 3. 差分分析
console.log("=== 差分分析 ===\n");

// 明日のデータで比較
const gasTomorrowRows = gasAllRows.filter(r => {
  const date = String(r.reserved_date || r["予約日"] || "").slice(0, 10);
  return date === tomorrowStr;
});

const supabaseTomorrowRows = supabaseAllRows.filter(r => {
  const date = String(r.reserved_date || "").slice(0, 10);
  return date === tomorrowStr;
});

console.log(`明日（${tomorrowStr}）のデータ:`);
console.log(`  GAS: ${gasTomorrowRows.length}件`);
console.log(`  Supabase: ${supabaseTomorrowRows.length}件`);
console.log(`  差: ${gasTomorrowRows.length - supabaseTomorrowRows.length}件\n`);

if (gasTomorrowRows.length > supabaseTomorrowRows.length) {
  // GASにあってSupabaseにない予約を抽出
  const gasReserveIds = new Set(
    gasTomorrowRows.map(r => r.reserveId || r.reserve_id).filter(id => id)
  );
  const supabaseReserveIds = new Set(
    supabaseTomorrowRows.map(r => r.reserve_id).filter(id => id)
  );

  const missingReserveIds = [...gasReserveIds].filter(id => !supabaseReserveIds.has(id));

  console.log(`GASにあってSupabaseにない予約: ${missingReserveIds.length}件\n`);

  if (missingReserveIds.length > 0) {
    console.log("--- 不足している予約データ ---");
    missingReserveIds.forEach((reserveId, i) => {
      const row = gasTomorrowRows.find(r => (r.reserveId || r.reserve_id) === reserveId);
      if (row) {
        console.log(`${i + 1}. reserveId: ${reserveId}`);
        console.log(`   患者ID: ${row.patient_id}`);
        console.log(`   名前: ${row.patient_name || row.name || row["氏名"]}`);
        console.log(`   予約日時: ${row.reserved_date || row["予約日"]} ${row.reserved_time || row["予約時間"]}`);
        console.log("");
      }
    });
  }
} else if (gasTomorrowRows.length === supabaseTomorrowRows.length) {
  console.log("✅ GASとSupabaseのデータ件数が一致しています\n");
}

console.log("=== 診断結果 ===");
if (gasAllRows.length > supabaseAllRows.length) {
  console.log(`❌ Supabaseに不足データがあります（GAS: ${gasAllRows.length}件、Supabase: ${supabaseAllRows.length}件）`);
  console.log("   以下のコマンドを実行してSupabaseを同期してください:");
  console.log("   npx tsx scripts/sync-intake-to-supabase.ts");
} else if (gasAllRows.length === supabaseAllRows.length) {
  console.log(`✅ 全データ件数が一致しています（${gasAllRows.length}件）`);
} else {
  console.log(`⚠️ Supabaseの方がデータが多いです（GAS: ${gasAllRows.length}件、Supabase: ${supabaseAllRows.length}件）`);
  console.log("   GASからデータが削除された可能性があります");
}
console.log("");
