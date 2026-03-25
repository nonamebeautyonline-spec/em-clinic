// scripts/backfill-ai-reply-examples.ts
// 3/9（RAG導入）〜今日までの手動返信をai_reply_examplesにバックフィル
//
// 使い方:
//   npx tsx scripts/backfill-ai-reply-examples.ts --tenant-id <UUID>          # ドライラン
//   npx tsx scripts/backfill-ai-reply-examples.ts --tenant-id <UUID> --exec   # 実行
//
// 対象: message_logのoutgoing（スタッフ手動返信）で、直前のincoming（患者メッセージ）とペアにして
//       ai_reply_examplesに未登録のものを学習例として保存する

import { readFileSync } from "fs";
import { resolve } from "path";
import OpenAI from "openai";

// --- .env.local読み込み ---
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
const OPENAI_API_KEY = envVars.OPENAI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("環境変数不足: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("環境変数不足: OPENAI_API_KEY");
  process.exit(1);
}

// --- 引数パース ---
const args = process.argv.slice(2);
const tenantId = args[args.indexOf("--tenant-id") + 1] || "";
const execMode = args.includes("--exec");
const SINCE = "2026-03-09T00:00:00+09:00"; // RAG導入日

if (!tenantId) {
  console.error("--tenant-id を指定してください");
  process.exit(1);
}

console.log(`=== AI返信学習例バックフィル ===`);
console.log(`テナント: ${tenantId}`);
console.log(`対象期間: ${SINCE} 〜 現在`);
console.log(`モード: ${execMode ? "実行" : "ドライラン"}`);
console.log("");

// --- Supabase REST API ヘルパー ---
async function supabaseGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function supabaseInsert(table: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
}

// --- OpenAI Embedding ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });
    return res.data[0].embedding;
  } catch (err) {
    console.error("  [Embedding] 生成エラー:", err);
    return null;
  }
}

// --- メイン処理 ---
interface MessageRow {
  id: number;
  patient_id: string;
  content: string;
  direction: string;
  sent_at: string;
  message_type: string;
}

interface ExampleRow {
  question: string;
  answer: string;
}

async function main() {
  // 1. 対象期間のスタッフ手動返信（outgoing, individual）を取得
  //    message_type=individual がトーク画面からの手動返信
  //    text は自動送信テンプレ（再処方承認等）なので除外
  console.log("1. スタッフ手動返信を取得中...");
  const outgoing = await supabaseGet<MessageRow[]>(
    `message_log?tenant_id=eq.${tenantId}` +
    `&direction=eq.outgoing` +
    `&message_type=eq.individual` +
    `&sent_at=gte.${encodeURIComponent(SINCE)}` +
    `&order=sent_at.asc` +
    `&limit=10000`
  );
  console.log(`  ${outgoing.length}件のスタッフ返信`);

  if (outgoing.length === 0) {
    console.log("対象なし。終了。");
    return;
  }

  // 2. 対象期間の患者メッセージ（incoming）を取得
  console.log("2. 患者メッセージを取得中...");
  const incoming = await supabaseGet<MessageRow[]>(
    `message_log?tenant_id=eq.${tenantId}` +
    `&direction=eq.incoming` +
    `&message_type=eq.text` +
    `&sent_at=gte.${encodeURIComponent(SINCE)}` +
    `&order=sent_at.asc` +
    `&limit=10000`
  );
  console.log(`  ${incoming.length}件の患者メッセージ`);

  // incoming を patient_id -> メッセージ配列（時系列）のマップに
  const incomingByPatient = new Map<string, MessageRow[]>();
  for (const msg of incoming) {
    const list = incomingByPatient.get(msg.patient_id) || [];
    list.push(msg);
    incomingByPatient.set(msg.patient_id, list);
  }

  // 3. 既存の学習例を取得（重複排除用）
  console.log("3. 既存学習例を取得中...");
  const existing = await supabaseGet<ExampleRow[]>(
    `ai_reply_examples?tenant_id=eq.${tenantId}` +
    `&select=question,answer` +
    `&limit=100000`
  );
  const existingSet = new Set(existing.map((e) => `${e.question}|||${e.answer}`));
  console.log(`  ${existing.length}件の既存学習例`);

  // 4. Q&Aペアを構築
  console.log("4. Q&Aペア構築中...");
  interface QAPair {
    question: string;
    answer: string;
    patientId: string;
    sentAt: string;
  }
  const pairs: QAPair[] = [];
  const skippedDuplicate = { count: 0 };
  const skippedNoIncoming = { count: 0 };
  const seenQA = new Set<string>(); // 同一患者・同一Qの重複排除

  for (const out of outgoing) {
    const patientIncoming = incomingByPatient.get(out.patient_id);
    if (!patientIncoming || patientIncoming.length === 0) {
      skippedNoIncoming.count++;
      continue;
    }

    // スタッフ返信より前の患者メッセージを取得（直近3件まで）
    const beforeReply = patientIncoming.filter((m) => m.sent_at < out.sent_at);
    if (beforeReply.length === 0) {
      skippedNoIncoming.count++;
      continue;
    }

    // 直近3件を結合してquestionとする
    const recentIncoming = beforeReply.slice(-3);
    const question = recentIncoming.map((m) => m.content).join("\n");
    const answer = out.content;

    // --- フィルタ: 学習価値のないものを除外 ---

    // 短すぎるものはスキップ
    if (question.trim().length < 5 || answer.trim().length < 10) continue;

    // テンプレ回答を除外
    const templatePatterns = [
      "メッセージより直接お問い合わせください",
      "【価格表】",
      "[よくある質問",
      "よくある質問（Q&A",
      "本日携帯電話の調子が悪く",
      "本日電話の調子が悪く",
    ];
    if (templatePatterns.some((p) => answer.includes(p))) continue;

    // URL・画像のみの回答を除外
    if (/^https?:\/\//.test(answer.trim())) continue;
    if (answer.startsWith("[") && answer.endsWith("]") && !answer.includes("\n")) continue;

    // 短い定型応答を除外（承知しました系）
    const shortTemplates = [
      /^承知しました[。！]?$/,
      /^よろしくお願い(いた|致)します[。！]?$/,
      /^ありがとうございます[。！]?$/,
      /^引き続きよろしくお願いいたします[。！]?$/,
      /^この後よろしいでしょうか[。？]?$/,
      /^再度おかけします[。]?$/,
      /^本日発送となります[。🌸]?$/,
      /^問題ありません[。]?/,
    ];
    const answerFirstLine = answer.split("\n")[0].trim();
    if (answer.trim().length < 30 && shortTemplates.some((p) => p.test(answerFirstLine))) continue;

    // 個人情報を含む回答を除外（口座番号、電話番号、住所の直接記載）
    if (/\d{7,}/.test(answer) && /(口座|追跡番号|番号)/.test(answer)) continue;
    if (/〒?\d{3}-?\d{4}/.test(answer)) continue; // 郵便番号
    if (/0\d{1,4}-?\d{1,4}-?\d{3,4}/.test(answer) && /登録|番号/.test(answer)) continue; // 電話番号の直接記載

    // Qが1語のみ（「予約」「はい」等）を除外
    if (question.replace(/\s/g, "").length < 8) continue;

    // 同一患者・同一Qの重複を除外（最後の回答のみ残す → 後で逆順処理するので先に見たものを残す）
    const dedupeKey = `${out.patient_id}|||${question}`;
    if (seenQA.has(dedupeKey)) continue;
    seenQA.add(dedupeKey);

    // 重複チェック（既存学習例）
    if (existingSet.has(`${question}|||${answer}`)) {
      skippedDuplicate.count++;
      continue;
    }

    pairs.push({ question, answer, patientId: out.patient_id, sentAt: out.sent_at });
  }

  console.log(`  ${pairs.length}件の新規Q&Aペア`);
  console.log(`  スキップ: 重複=${skippedDuplicate.count}, 患者メッセージなし=${skippedNoIncoming.count}`);
  console.log("");

  if (pairs.length === 0) {
    console.log("新規ペアなし。終了。");
    return;
  }

  // 5. プレビュー表示（最初の10件）
  console.log("--- プレビュー（最初の10件） ---");
  for (const pair of pairs.slice(0, 10)) {
    console.log(`[${pair.sentAt}] patient=${pair.patientId}`);
    console.log(`  Q: ${pair.question.slice(0, 80).replace(/\n/g, " / ")}${pair.question.length > 80 ? "..." : ""}`);
    console.log(`  A: ${pair.answer.slice(0, 80).replace(/\n/g, " / ")}${pair.answer.length > 80 ? "..." : ""}`);
    console.log("");
  }

  if (!execMode) {
    console.log(`ドライラン完了。--exec をつけて実行してください（${pairs.length}件を保存）。`);
    return;
  }

  // 6. 実行: embedding生成 + DB保存
  console.log(`=== ${pairs.length}件を保存中... ===`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    try {
      // embedding生成
      const embedding = await generateEmbedding(pair.question);

      // DB保存
      await supabaseInsert("ai_reply_examples", {
        tenant_id: tenantId,
        question: pair.question,
        answer: pair.answer,
        source: "manual_reply",
        draft_id: null,
        embedding: embedding ? JSON.stringify(embedding) : null,
      });

      success++;
      if ((i + 1) % 10 === 0 || i === pairs.length - 1) {
        console.log(`  ${i + 1}/${pairs.length} 完了 (成功=${success}, 失敗=${failed})`);
      }

      // OpenAI レートリミット対策（RPM制限）
      if (i < pairs.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}] エラー: patient=${pair.patientId}`, err);
    }
  }

  console.log("");
  console.log(`=== 完了 ===`);
  console.log(`成功: ${success}件 / 失敗: ${failed}件`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
