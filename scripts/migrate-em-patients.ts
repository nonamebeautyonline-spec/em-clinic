// scripts/migrate-em-patients.ts
// EMオンラインクリニック: LステップCSVからpatientsテーブルへ患者データを移行
//
// 使い方:
//   npx tsx scripts/migrate-em-patients.ts --file ./data/member_*.csv --tenant-id <UUID>
//   npx tsx scripts/migrate-em-patients.ts --file ./data/member_*.csv --tenant-id <UUID> --exec
//
// CSV形式（Shift-JIS、カンマ区切り、ダブルクォート囲み）:
//   ヘッダ1行目: 登録IDメタ情報（スキップ）
//   ヘッダ2行目: ID, 表示名, LINE登録名, 本名, システム表示名, 対応マーク, ステータスメッセージ,
//               友だち追加日時, 個別メモ, 表示状態, ユーザーブロック, 最終メッセージ, 最終メッセージ日時, 電話番号

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

// 引数パース
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const csvFile = getArg("file");
const tenantId = getArg("tenant-id");
const isExec = args.includes("--exec");

if (!csvFile || !tenantId) {
  console.error("使い方: npx tsx scripts/migrate-em-patients.ts --file <CSV> --tenant-id <UUID> [--exec]");
  process.exit(1);
}

// normalizeJPPhone (lib/phone.ts と同じロジック)
function normalizeJPPhone(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  let digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0080")) digits = "080" + digits.slice(4);
  else if (digits.startsWith("0090")) digits = "090" + digits.slice(4);
  else if (digits.startsWith("0070")) digits = "070" + digits.slice(4);
  else if (digits.startsWith("00")) digits = digits.slice(1);
  if (digits.startsWith("81") && digits.length >= 11) {
    digits = digits.slice(2);
    if (!digits.startsWith("0")) digits = "0" + digits;
  }
  if (!digits.startsWith("0") && /^[789]/.test(digits)) digits = "0" + digits;
  return digits;
}

// cleanEmName (lib/em-name-cleaner.ts と同じロジック)
function cleanEmName(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  let s = trimmed.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}\u{2705}\u{274C}\u{2B55}\u{26AA}\u{26AB}\u{25CF}\u{25CB}\u{25A0}\u{25A1}\u{2764}\u{2716}\u{2714}\u{23F0}-\u{23FA}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FC}\u{25FB}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{FE0E}]+/u,
    "",
  ).trim();
  const prefixes = [
    "郵便局", "診断書", "要確認", "確認済", "確認済み",
    "発送済", "発送済み", "返品", "保留", "キャンセル",
    "再発送", "転送", "書留", "速達", "レターパック",
    "ゆうパック", "宅急便", "クリックポスト", "ネコポス",
  ];
  for (const prefix of prefixes) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length).trim();
      break;
    }
  }
  const parts = s.split(/[\s　]+/).filter(Boolean);
  if (parts.length >= 2 && prefixes.some((p) => parts[0].includes(p))) {
    s = parts.slice(1).join("");
  } else if (parts.length >= 2) {
    s = parts.join("");
  }
  return s || trimmed;
}

// 改行対応CSVパーサー（個別メモ等に改行含む）
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

  if (currentField || currentFields.length > 0) {
    currentFields.push(currentField.trim());
    if (currentFields.length > 0 && currentFields.some((f) => f !== "")) {
      records.push(currentFields);
    }
  }

  return records;
}

type PatientRow = {
  lstepId: string;
  displayName: string;
  lineRegName: string;
  realName: string;
  name: string;       // クリーニング後の最終氏名
  nameRaw: string;    // 元の表示名
  tel: string;
  telRaw: string;
  addedAt: string;    // 友だち追加日時
  status: string;     // 表示状態
  blocked: string;    // ユーザーブロック（0/1）
};

async function main() {
  console.log("=== EMオンラインクリニック 患者データ移行 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);
  console.log(`CSVファイル: ${csvFile}`);

  // 1. Shift-JIS → UTF-8 変換して読み込み（改行含むフィールド対応）
  const buffer = readFileSync(resolve(csvFile));
  const raw = new TextDecoder("shift_jis").decode(buffer);
  const allRows = parseCSVWithMultiline(raw);
  console.log(`\n読み込みレコード数: ${allRows.length}`);

  // ヘッダ2行スキップ（0行目: メタ情報、1行目: カラム名）
  // カラム: ID(0), 表示名(1), LINE登録名(2), 本名(3), システム表示名(4), 対応マーク(5),
  //         ステータスメッセージ(6), 友だち追加日時(7), 個別メモ(8), 表示状態(9),
  //         ユーザーブロック(10), 最終メッセージ(11), 最終メッセージ日時(12), 電話番号(13)
  const headerLine = allRows[1];
  console.log(`ヘッダ: ${headerLine.join(" | ")}`);

  // 2. パースと変換
  const patients: PatientRow[] = [];
  let parseErrors = 0;

  for (let i = 2; i < allRows.length; i++) {
    const fields = allRows[i];
    if (fields.length < 14) {
      parseErrors++;
      if (parseErrors <= 5) {
        console.error(`  レコード${i + 1}: カラム不足 (${fields.length}列)`);
      }
      continue;
    }

    const lstepId = fields[0];
    if (!lstepId || !/^\d+$/.test(lstepId)) continue; // 数値IDでない行はスキップ

    const displayName = fields[1];
    const lineRegName = fields[2];
    const realName = fields[3];
    const telRaw = fields[13];

    // 氏名の優先順位: 本名 > 表示名
    const nameSource = realName || displayName;

    patients.push({
      lstepId,
      displayName,
      lineRegName,
      realName,
      nameRaw: nameSource,
      name: cleanEmName(nameSource),
      telRaw,
      tel: normalizeJPPhone(telRaw),
      addedAt: fields[7],
      status: fields[9],
      blocked: fields[10],
    });
  }

  console.log(`パース成功: ${patients.length}件`);
  console.log(`パースエラー: ${parseErrors}件`);

  // ブロック済みユーザーの統計
  const blockedUsers = patients.filter((p) => p.blocked === "1");
  console.log(`ブロック済みユーザー: ${blockedUsers.length}件`);

  // 3. 重複検出
  const phoneGroups = new Map<string, PatientRow[]>();
  for (const p of patients) {
    if (!p.tel) continue;
    const group = phoneGroups.get(p.tel) || [];
    group.push(p);
    phoneGroups.set(p.tel, group);
  }

  const duplicatePhones: { tel: string; entries: PatientRow[] }[] = [];
  for (const [tel, entries] of phoneGroups) {
    if (entries.length > 1) {
      duplicatePhones.push({ tel, entries });
    }
  }

  // LステップID重複チェック
  const lstepIdSet = new Set<string>();
  const duplicateLstepIds: string[] = [];
  for (const p of patients) {
    if (lstepIdSet.has(p.lstepId)) {
      duplicateLstepIds.push(p.lstepId);
    }
    lstepIdSet.add(p.lstepId);
  }

  // 電話番号なし
  const noPhone = patients.filter((p) => !p.tel);

  // レポート出力
  console.log("\n=== 重複・異常レポート ===");
  console.log(`電話番号なし: ${noPhone.length}件`);
  console.log(`同一電話番号・複数エントリ: ${duplicatePhones.length}グループ`);
  console.log(`LステップID重複: ${duplicateLstepIds.length}件`);

  if (duplicatePhones.length > 0) {
    console.log("\n--- 同一電話番号・複数エントリ（上位20件）---");
    for (const dup of duplicatePhones.slice(0, 20)) {
      console.log(`  ${dup.tel}: ${dup.entries.map((e) => `${e.name}(${e.lstepId})`).join(", ")}`);
    }
  }

  // 氏名クリーニング例
  const cleanedExamples = patients.slice(0, 100).filter((p) => p.name !== p.nameRaw);
  if (cleanedExamples.length > 0) {
    console.log(`\n--- 氏名クリーニング例 ---`);
    for (const ex of cleanedExamples.slice(0, 10)) {
      console.log(`  "${ex.nameRaw}" → "${ex.name}"`);
    }
  }

  // 重複レポートをCSVに保存
  if (duplicatePhones.length > 0) {
    const reportLines = ["電話番号,LステップID,氏名,氏名(元),友だち追加日時,ブロック"];
    for (const dup of duplicatePhones) {
      for (const e of dup.entries) {
        reportLines.push(`${dup.tel},${e.lstepId},${e.name},"${e.nameRaw}",${e.addedAt},${e.blocked}`);
      }
    }
    const reportPath = resolve(process.cwd(), "data/em-patient-duplicates.csv");
    writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
    console.log(`\n重複レポート出力: ${reportPath}`);
  }

  // 4. LステップID重複を除外（最初の出現のみ保持）
  const uniquePatients: PatientRow[] = [];
  const seenLstepIds = new Set<string>();
  for (const p of patients) {
    if (seenLstepIds.has(p.lstepId)) continue;
    seenLstepIds.add(p.lstepId);
    uniquePatients.push(p);
  }

  console.log(`\n投入対象（重複除外後）: ${uniquePatients.length}件`);

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 5. バッチINSERT
  console.log("\npatientsテーブルにINSERT中...");
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < uniquePatients.length; i += batchSize) {
    const batch = uniquePatients.slice(i, i + batchSize);
    const records = batch.map((p) => ({
      name: p.name || null,
      tel: p.tel || null,
      answerer_id: p.lstepId,
      tenant_id: tenantId,
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
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
        const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
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
          const singleErr = await singleRes.text();
          console.error(`  個別INSERT失敗 (${record.answerer_id}): ${singleErr}`);
        }
      }
      continue;
    }

    inserted += batch.length;
    console.log(`  進捗: ${inserted}/${uniquePatients.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`投入成功: ${inserted}件`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
