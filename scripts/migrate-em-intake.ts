// scripts/migrate-em-intake.ts
// EMオンラインクリニック: 問診CSV（Lステップ回答エクスポート）→ intakeテーブルへ移行
//
// 使い方:
//   npx tsx scripts/migrate-em-intake.ts --file ./data/メディカルダイエット回答_*.csv --tenant-id <UUID>
//   npx tsx scripts/migrate-em-intake.ts --file ./data/メディカルダイエット回答_*.csv --tenant-id <UUID> --exec
//
// CSV形式（Shift-JIS、カンマ区切り、ダブルクォート囲み、改行含むフィールドあり）:
//   回答ID(0), 回答日時(1), 回答者ID(2), 回答者名(3), 回答欄(4), 氏名(5),
//   氏名(カナ)(6), 性別(7), 生年月日(8), 本人確認書類(9), 書類画像(10),
//   現在治療中(11), 疾患名(12), GLP-1使用歴(13), 現在内服(14), 薬剤名(15),
//   アレルギー有無(16), アレルギー名(17), ご希望のお薬(18), アンケート(19),
//   以前利用(20), その他(21)

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// .env.local読み込み
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
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

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("環境変数不足: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const csvFile = getArg("file");
const tenantId = getArg("tenant-id");
const isExec = args.includes("--exec");
// 各回答者の最新回答のみ投入するかどうか（デフォルト: 最新のみ）
const allResponses = args.includes("--all-responses");

if (!csvFile || !tenantId) {
  console.error("使い方: npx tsx scripts/migrate-em-intake.ts --file <CSV> --tenant-id <UUID> [--exec] [--all-responses]");
  process.exit(1);
}

// 改行対応CSVパーサー（Shift-JIS変換後のUTF-8文字列を受け取る）
function parseCSVWithMultiline(content: string): string[][] {
  const records: string[][] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentFields.push(currentField.trim());
        currentField = "";
      } else if (ch === "\n" || ch === "\r") {
        // \r\n の場合は \n もスキップ
        if (ch === "\r" && i + 1 < content.length && content[i + 1] === "\n") {
          i++;
        }
        currentFields.push(currentField.trim());
        if (currentFields.length > 0 && currentFields.some((f) => f !== "")) {
          records.push(currentFields);
        }
        currentFields = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }

  // 最後のレコード
  if (currentField || currentFields.length > 0) {
    currentFields.push(currentField.trim());
    if (currentFields.length > 0 && currentFields.some((f) => f !== "")) {
      records.push(currentFields);
    }
  }

  return records;
}

async function supabaseGet<T>(table: string, params: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${table} 失敗: ${res.status} ${await res.text()}`);
  return res.json();
}

// 「はい」「いいえ」→ "yes"/"no" 変換
function yesNoConvert(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("はい")) return "yes";
  if (raw === "いいえ") return "no";
  return raw;
}

type IntakeRecord = {
  answerer_id: string;
  patient_id: string | null;
  answers: Record<string, string>;
  created_at: string;
  tenant_id: string;
};

async function main() {
  console.log("=== EMオンラインクリニック 問診データ移行 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);
  console.log(`CSVファイル: ${csvFile}`);
  console.log(`回答取り込み: ${allResponses ? "全回答" : "各回答者の最新のみ"}`);

  // 1. Shift-JIS → UTF-8 変換して読み込み
  const buffer = readFileSync(resolve(csvFile));
  const raw = new TextDecoder("shift_jis").decode(buffer);
  const allRows = parseCSVWithMultiline(raw);
  console.log(`\n読み込みレコード数: ${allRows.length}`);

  // ヘッダ行（1行目）
  const header = allRows[0];
  console.log(`ヘッダ(${header.length}列): ${header.slice(0, 8).join(" | ")}...`);

  // 2. データ行をパース
  const dataRows = allRows.slice(1);
  let parseErrors = 0;

  type CsvRecord = {
    answerId: string;
    answeredAt: string;
    answererId: string;    // LステップUID
    answererName: string;
    ngCheck: string;       // 回答欄
    name: string;
    nameKana: string;
    sex: string;
    birthday: string;
    idType: string;
    currentDiseaseYesNo: string;
    currentDiseaseDetail: string;
    glpHistory: string;
    medYesNo: string;
    medDetail: string;
    allergyYesNo: string;
    allergyDetail: string;
    desiredMed: string;
    entryRoute: string;
    previousAccount: string;
    other: string;
  };

  const csvRecords: CsvRecord[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.length < 10) {
      parseErrors++;
      if (parseErrors <= 5) {
        console.error(`  行${i + 2}: カラム不足 (${row.length}列)`);
      }
      continue;
    }

    const answerId = row[0];
    if (!answerId || !/^\d+$/.test(answerId)) continue;

    csvRecords.push({
      answerId,
      answeredAt: row[1] || "",
      answererId: row[2] || "",
      answererName: row[3] || "",
      ngCheck: row[4] || "",
      name: row[5] || "",
      nameKana: row[6] || "",
      sex: row[7] || "",
      birthday: row[8] || "",
      idType: row[9] || "",
      currentDiseaseYesNo: row[11] || "",
      currentDiseaseDetail: row[12] || "",
      glpHistory: row[13] || "",
      medYesNo: row[14] || "",
      medDetail: row[15] || "",
      allergyYesNo: row[16] || "",
      allergyDetail: row[17] || "",
      desiredMed: row[18] || "",
      entryRoute: row[19] || "",
      previousAccount: row[20] || "",
      other: row[21] || "",
    });
  }

  console.log(`パース成功: ${csvRecords.length}件`);
  console.log(`パースエラー: ${parseErrors}件`);

  // ユニーク回答者数
  const uniqueAnswerers = new Set(csvRecords.map((r) => r.answererId));
  console.log(`ユニーク回答者ID: ${uniqueAnswerers.size}人`);

  // 回答者ごとの回答数分布
  const answererCounts = new Map<string, number>();
  for (const r of csvRecords) {
    answererCounts.set(r.answererId, (answererCounts.get(r.answererId) || 0) + 1);
  }
  const multipleAnswerers = [...answererCounts.entries()].filter(([_, c]) => c > 1);
  console.log(`複数回答者: ${multipleAnswerers.length}人`);

  // 氏名あり/なし
  const withName = csvRecords.filter((r) => r.name);
  const withBirthday = csvRecords.filter((r) => r.birthday);
  console.log(`氏名あり: ${withName.length}件`);
  console.log(`生年月日あり: ${withBirthday.length}件`);

  // 3. 回答者ごとに最新のみ取得（デフォルト）
  let targetRecords: CsvRecord[];
  if (allResponses) {
    targetRecords = csvRecords;
  } else {
    // 回答者IDごとに最新（answeredAtが最も遅い、かつ氏名がある回答を優先）
    const latestByAnswerer = new Map<string, CsvRecord>();
    for (const r of csvRecords) {
      const existing = latestByAnswerer.get(r.answererId);
      if (!existing) {
        latestByAnswerer.set(r.answererId, r);
        continue;
      }
      // 氏名がある回答を優先、同じ場合は回答日時が遅い方
      const existingHasName = !!existing.name;
      const currentHasName = !!r.name;
      if (currentHasName && !existingHasName) {
        latestByAnswerer.set(r.answererId, r);
      } else if (currentHasName === existingHasName && r.answeredAt > existing.answeredAt) {
        latestByAnswerer.set(r.answererId, r);
      }
    }
    targetRecords = [...latestByAnswerer.values()];
  }

  console.log(`\n投入対象: ${targetRecords.length}件`);

  // 4. 患者テーブルからanswerer_id → patient_idのマップ取得
  console.log("\n患者データ取得中...");
  const patients = await supabaseGet<{ patient_id: string; answerer_id: string }>(
    "patients",
    `select=patient_id,answerer_id&tenant_id=eq.${tenantId}&limit=100000`,
  );
  console.log(`患者データ: ${patients.length}件`);

  const answererToPatient = new Map<string, string>();
  for (const p of patients) {
    if (p.answerer_id) {
      answererToPatient.set(p.answerer_id, p.patient_id);
    }
  }

  // 5. intakeレコード構築
  const intakeRecords: IntakeRecord[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedAnswerers: string[] = [];

  for (const r of targetRecords) {
    const patientId = answererToPatient.get(r.answererId);

    if (patientId) {
      matchedCount++;
    } else {
      unmatchedCount++;
      if (unmatchedAnswerers.length < 100) {
        unmatchedAnswerers.push(r.answererId);
      }
    }

    // answersのJSON構築（Lステップ問診→intakeフォーマット変換）
    const answers: Record<string, string> = {};

    // NG判定チェック
    if (r.ngCheck) {
      answers.ng_check = r.ngCheck.includes("該当しません") ? "no" : "yes";
      answers.ng_check_raw = r.ngCheck;
    }

    // 個人情報
    if (r.name) answers["氏名"] = r.name;
    if (r.nameKana) answers["カナ"] = r.nameKana;
    if (r.sex) answers["性別"] = r.sex;
    if (r.birthday) answers["生年月日"] = r.birthday;
    if (r.idType) answers["本人確認書類"] = r.idType;

    // 問診回答
    if (r.currentDiseaseYesNo) {
      answers.current_disease_yesno = yesNoConvert(r.currentDiseaseYesNo);
    }
    if (r.currentDiseaseDetail) {
      answers.current_disease_detail = r.currentDiseaseDetail;
    }
    if (r.glpHistory) {
      answers.glp_history = r.glpHistory;
    }
    if (r.medYesNo) {
      answers.med_yesno = yesNoConvert(r.medYesNo);
    }
    if (r.medDetail) {
      answers.med_detail = r.medDetail;
    }
    if (r.allergyYesNo) {
      answers.allergy_yesno = yesNoConvert(r.allergyYesNo);
    }
    if (r.allergyDetail) {
      answers.allergy_detail = r.allergyDetail;
    }
    if (r.desiredMed) {
      answers.desired_medication = r.desiredMed;
    }
    if (r.entryRoute) {
      answers.entry_route = r.entryRoute;
    }
    if (r.previousAccount) {
      answers.previous_account = r.previousAccount;
    }
    if (r.other) {
      answers.other = r.other;
    }

    intakeRecords.push({
      answerer_id: r.answererId,
      patient_id: patientId || null,
      answers,
      created_at: r.answeredAt ? `${r.answeredAt}+09:00` : new Date().toISOString(),
      tenant_id: tenantId!,
    });
  }

  console.log(`\n--- 照合結果 ---`);
  console.log(`患者紐付け済み: ${matchedCount}件`);
  console.log(`患者未紐付け: ${unmatchedCount}件`);

  // 未紐付けレポート出力
  if (unmatchedAnswerers.length > 0) {
    const reportLines = ["回答者ID,回答者名,氏名,回答日時"];
    for (const aid of unmatchedAnswerers) {
      const r = targetRecords.find((t) => t.answererId === aid);
      if (r) {
        reportLines.push(`${r.answererId},"${r.answererName}","${r.name}",${r.answeredAt}`);
      }
    }
    const reportPath = resolve(process.cwd(), "data/em-intake-unmatched.csv");
    writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
    console.log(`未紐付けレポート出力: ${reportPath}`);
  }

  // サンプル（最初の3件）
  console.log(`\n--- サンプル ---`);
  for (const r of intakeRecords.slice(0, 3)) {
    const nameInAnswers = r.answers["氏名"] || "(なし)";
    console.log(`  answerer_id=${r.answerer_id} patient_id=${r.patient_id || "NULL"} 氏名=${nameInAnswers}`);
  }

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 6. バッチINSERT
  console.log("\nintakeテーブルにINSERT中...");
  const batchSize = 500;
  let inserted = 0;

  // patient_idがNULLのレコードはスキップ（患者が見つからない）
  const insertTargets = intakeRecords.filter((r) => r.patient_id);
  console.log(`患者紐付け済みのみ投入: ${insertTargets.length}件`);

  for (let i = 0; i < insertTargets.length; i += batchSize) {
    const batch = insertTargets.slice(i, i + batchSize);
    const records = batch.map((r) => ({
      patient_id: r.patient_id,
      answerer_id: r.answerer_id,
      answers: r.answers,
      created_at: r.created_at,
      tenant_id: r.tenant_id,
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/intake`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(records),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`バッチ ${i} エラー: ${res.status} ${errorText}`);
      // 個別INSERTにフォールバック
      for (const record of records) {
        const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/intake`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(record),
        });
        if (singleRes.ok) {
          inserted++;
        } else {
          console.error(`  個別INSERT失敗 (${record.answerer_id}): ${await singleRes.text()}`);
        }
      }
      continue;
    }

    inserted += batch.length;
    console.log(`  進捗: ${inserted}/${insertTargets.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`投入成功: ${inserted}件`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
