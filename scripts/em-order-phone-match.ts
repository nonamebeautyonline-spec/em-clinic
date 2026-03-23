// scripts/em-order-phone-match.ts
// EMオンラインクリニック: em_order_staging の決済データを patients と電話番号照合
//
// 使い方:
//   npx tsx scripts/em-order-phone-match.ts --tenant-id <UUID>           # ドライラン
//   npx tsx scripts/em-order-phone-match.ts --tenant-id <UUID> --exec    # 本番実行
//
// 5段階照合アルゴリズム:
//   Step 1: 電話番号完全一致（1対1）→ phone_exact
//   Step 2: 電話番号完全一致（1対多）→ メール or 氏名で絞り込み → phone_multi
//   Step 3: 電話番号ファジーマッチ（距離≤2）+ 氏名一致 → phone_fuzzy
//   Step 4: メールアドレスのみで照合 → email_only
//   Step 5: マッチなし → NULL（手動確認リスト）

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
const tenantId = getArg("tenant-id");
const isExec = args.includes("--exec");

if (!tenantId) {
  console.error("使い方: npx tsx scripts/em-order-phone-match.ts --tenant-id <UUID> [--exec]");
  process.exit(1);
}

// レーベンシュタイン距離（lib/patient-dedup.ts と同じ）
function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array<number>(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

// Supabase REST API ヘルパー
async function supabaseGet<T>(table: string, params: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`GET ${table} 失敗: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseUpdate(table: string, filter: string, body: Record<string, unknown>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table} 失敗: ${res.status} ${await res.text()}`);
}

type Patient = {
  patient_id: string;
  name: string | null;
  tel: string | null;
  email: string | null;
};

type StagingOrder = {
  id: number;
  source_phone_normalized: string | null;
  source_name: string | null;
  source_email: string | null;
  source_phone: string | null;
  source_name_raw: string | null;
  matched_patient_id: string | null;
};

type MatchResult = {
  stagingId: number;
  patientId: string;
  matchType: string;
  score: number;
  detail: string;
};

async function main() {
  console.log("=== EMオンラインクリニック 電話番号照合 ===");
  console.log(`モード: ${isExec ? "本番実行" : "ドライラン"}`);
  console.log(`テナントID: ${tenantId}`);

  // 1. EMテナントの全患者を取得
  console.log("\n患者データを取得中...");
  const patients = await supabaseGet<Patient>(
    "patients",
    `select=patient_id,name,tel,email&tenant_id=eq.${tenantId}&limit=100000`,
  );
  console.log(`患者数: ${patients.length}`);

  // 2. 未マッチのステージングデータを取得
  console.log("ステージングデータを取得中...");
  const staging = await supabaseGet<StagingOrder>(
    "em_order_staging",
    `select=id,source_phone_normalized,source_name,source_email,source_phone,source_name_raw,matched_patient_id&tenant_id=eq.${tenantId}&matched_patient_id=is.null&limit=100000`,
  );
  console.log(`未マッチ決済数: ${staging.length}`);

  if (staging.length === 0) {
    console.log("照合対象なし。全て紐付け済みです。");
    return;
  }

  // 3. インデックス構築
  console.log("\nインデックス構築中...");
  const phoneMap = new Map<string, Patient[]>();
  const emailMap = new Map<string, Patient[]>();
  const allPhones: { phone: string; patient: Patient }[] = [];

  for (const p of patients) {
    if (p.tel) {
      const group = phoneMap.get(p.tel) || [];
      group.push(p);
      phoneMap.set(p.tel, group);
      allPhones.push({ phone: p.tel, patient: p });
    }
    if (p.email) {
      const email = p.email.toLowerCase().trim();
      const group = emailMap.get(email) || [];
      group.push(p);
      emailMap.set(email, group);
    }
  }
  console.log(`電話番号インデックス: ${phoneMap.size}件`);
  console.log(`メールインデックス: ${emailMap.size}件`);

  // 4. 照合実行
  console.log("\n照合実行中...");
  const results: MatchResult[] = [];
  const unmatched: StagingOrder[] = [];
  const manualReview: { order: StagingOrder; candidates: { patient: Patient; phoneDist: number; nameDist: number }[] }[] = [];

  const stats = {
    phone_exact: 0,
    phone_multi: 0,
    phone_fuzzy: 0,
    email_only: 0,
    manual_review: 0,
    no_match: 0,
  };

  for (const order of staging) {
    const phone = order.source_phone_normalized || "";
    const email = (order.source_email || "").toLowerCase().trim();
    const name = order.source_name || "";

    // Step 1: 電話番号完全一致（1対1）
    if (phone) {
      const candidates = phoneMap.get(phone);
      if (candidates && candidates.length === 1) {
        results.push({
          stagingId: order.id,
          patientId: candidates[0].patient_id,
          matchType: "phone_exact",
          score: 95,
          detail: `電話番号完全一致: ${phone}`,
        });
        stats.phone_exact++;
        continue;
      }

      // Step 2: 電話番号完全一致（1対多）→ メール or 氏名で絞り込み
      if (candidates && candidates.length > 1) {
        // メールで絞り込み
        if (email) {
          const emailFiltered = candidates.filter(
            (c) => c.email && c.email.toLowerCase().trim() === email,
          );
          if (emailFiltered.length === 1) {
            results.push({
              stagingId: order.id,
              patientId: emailFiltered[0].patient_id,
              matchType: "phone_multi",
              score: 90,
              detail: `電話番号一致(${candidates.length}名中) + メール一致: ${email}`,
            });
            stats.phone_multi++;
            continue;
          }
        }

        // 氏名距離で絞り込み
        if (name) {
          const scored = candidates.map((c) => ({
            patient: c,
            dist: levenshteinDistance(name, c.name || ""),
          }));
          scored.sort((a, b) => a.dist - b.dist);

          if (scored[0].dist <= 2 && (scored.length === 1 || scored[1].dist > scored[0].dist + 1)) {
            results.push({
              stagingId: order.id,
              patientId: scored[0].patient.patient_id,
              matchType: "phone_multi",
              score: 85,
              detail: `電話番号一致(${candidates.length}名中) + 氏名距離${scored[0].dist}: "${name}" vs "${scored[0].patient.name}"`,
            });
            stats.phone_multi++;
            continue;
          }
        }

        // 絞り込めなかった → 手動確認
        manualReview.push({
          order,
          candidates: candidates.map((c) => ({
            patient: c,
            phoneDist: 0,
            nameDist: levenshteinDistance(name, c.name || ""),
          })),
        });
        stats.manual_review++;
        continue;
      }
    }

    // Step 3: 電話番号ファジーマッチ（距離≤2）
    if (phone && phone.length >= 10) {
      // パフォーマンス: 前方一致フィルタで候補を絞り込み
      const prefix = phone.substring(0, 3); // 080, 090, 070 等
      const fuzzyCandidates: { patient: Patient; phoneDist: number; nameDist: number }[] = [];

      for (const entry of allPhones) {
        // 同じプレフィックスで長さが近いもののみ比較
        if (!entry.phone.startsWith(prefix)) continue;
        if (Math.abs(entry.phone.length - phone.length) > 2) continue;

        const phoneDist = levenshteinDistance(phone, entry.phone);
        if (phoneDist > 0 && phoneDist <= 2) {
          const nameDist = name ? levenshteinDistance(name, entry.patient.name || "") : 999;
          fuzzyCandidates.push({ patient: entry.patient, phoneDist, nameDist });
        }
      }

      if (fuzzyCandidates.length > 0) {
        // 氏名も近い候補を優先
        fuzzyCandidates.sort((a, b) => {
          if (a.nameDist !== b.nameDist) return a.nameDist - b.nameDist;
          return a.phoneDist - b.phoneDist;
        });

        const best = fuzzyCandidates[0];
        if (best.nameDist <= 2) {
          results.push({
            stagingId: order.id,
            patientId: best.patient.patient_id,
            matchType: "phone_fuzzy",
            score: 75,
            detail: `電話番号ファジー(距離${best.phoneDist}): "${phone}" vs "${best.patient.tel}" + 氏名距離${best.nameDist}: "${name}" vs "${best.patient.name}"`,
          });
          stats.phone_fuzzy++;
          continue;
        }

        // 電話番号は近いが氏名が遠い → 手動確認
        manualReview.push({ order, candidates: fuzzyCandidates.slice(0, 5) });
        stats.manual_review++;
        continue;
      }
    }

    // Step 4: メールアドレスのみで照合
    if (email) {
      const emailCandidates = emailMap.get(email);
      if (emailCandidates && emailCandidates.length === 1) {
        results.push({
          stagingId: order.id,
          patientId: emailCandidates[0].patient_id,
          matchType: "email_only",
          score: 70,
          detail: `メールアドレスのみ一致: ${email}`,
        });
        stats.email_only++;
        continue;
      }
      if (emailCandidates && emailCandidates.length > 1) {
        manualReview.push({
          order,
          candidates: emailCandidates.map((c) => ({
            patient: c,
            phoneDist: phone ? levenshteinDistance(phone, c.tel || "") : 999,
            nameDist: levenshteinDistance(name, c.name || ""),
          })),
        });
        stats.manual_review++;
        continue;
      }
    }

    // Step 5: マッチなし
    unmatched.push(order);
    stats.no_match++;
  }

  // 5. レポート出力
  console.log("\n=== 照合結果サマリー ===");
  console.log(`総決済件数:      ${staging.length}`);
  console.log(`phone_exact:     ${stats.phone_exact} (電話番号完全一致・1対1)`);
  console.log(`phone_multi:     ${stats.phone_multi} (電話番号一致・メール/氏名で絞り込み)`);
  console.log(`phone_fuzzy:     ${stats.phone_fuzzy} (電話番号ファジーマッチ + 氏名一致)`);
  console.log(`email_only:      ${stats.email_only} (メールアドレスのみ一致)`);
  console.log(`manual_review:   ${stats.manual_review} (手動確認必要)`);
  console.log(`no_match:        ${stats.no_match} (マッチなし)`);
  console.log(`自動紐付け合計:  ${results.length}`);

  // 手動確認リストをCSV出力
  if (manualReview.length > 0) {
    const csvLines = ["staging_id,source_phone,source_name,source_name_raw,source_email,候補patient_id,候補name,候補tel,電話距離,氏名距離"];
    for (const item of manualReview) {
      for (const c of item.candidates) {
        csvLines.push([
          item.order.id,
          item.order.source_phone || "",
          item.order.source_name || "",
          item.order.source_name_raw || "",
          item.order.source_email || "",
          c.patient.patient_id,
          c.patient.name || "",
          c.patient.tel || "",
          c.phoneDist,
          c.nameDist,
        ].join(","));
      }
    }
    const reviewPath = resolve(process.cwd(), "data/em-manual-review.csv");
    writeFileSync(reviewPath, csvLines.join("\n"), "utf-8");
    console.log(`\n手動確認リスト出力: ${reviewPath}`);
  }

  // マッチなしリストをCSV出力
  if (unmatched.length > 0) {
    const csvLines = ["staging_id,source_phone,source_phone_normalized,source_name,source_name_raw,source_email"];
    for (const o of unmatched) {
      csvLines.push([
        o.id,
        o.source_phone || "",
        o.source_phone_normalized || "",
        o.source_name || "",
        o.source_name_raw || "",
        o.source_email || "",
      ].join(","));
    }
    const unmatchedPath = resolve(process.cwd(), "data/em-unmatched.csv");
    writeFileSync(unmatchedPath, csvLines.join("\n"), "utf-8");
    console.log(`マッチなしリスト出力: ${unmatchedPath}`);
  }

  // phone_fuzzy候補リスト
  const fuzzyResults = results.filter((r) => r.matchType === "phone_fuzzy");
  if (fuzzyResults.length > 0) {
    console.log(`\n--- 電話番号ファジーマッチ確認推奨（上位20件）---`);
    for (const r of fuzzyResults.slice(0, 20)) {
      console.log(`  #${r.stagingId}: ${r.detail}`);
    }
  }

  if (!isExec) {
    console.log("\n[ドライラン] --exec フラグで本番実行してください");
    return;
  }

  // 6. em_order_staging を UPDATE
  console.log("\n照合結果をem_order_stagingに反映中...");
  let updated = 0;
  const batchSize = 100;

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    for (const r of batch) {
      await supabaseUpdate(
        "em_order_staging",
        `id=eq.${r.stagingId}`,
        {
          matched_patient_id: r.patientId,
          match_type: r.matchType,
          match_score: r.score,
          match_detail: r.detail,
        },
      );
      updated++;
    }
    console.log(`  進捗: ${updated}/${results.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`更新成功: ${updated}件`);
  console.log(`手動確認必要: ${manualReview.length}件 → data/em-manual-review.csv`);
  console.log(`マッチなし: ${unmatched.length}件 → data/em-unmatched.csv`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
