// AI返信の判定・返信案生成・送信処理

import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { shouldProcessWithAI } from "@/lib/ai-reply-filter";
import { sendApprovalFlexMessage } from "@/lib/ai-reply-approval";
import { pushMessage } from "@/lib/line-push";
import { redis } from "@/lib/redis";
import { rejectCategoryLabels, type RejectCategory } from "@/lib/validations/ai-reply";
import { isWithinBusinessHours } from "@/lib/business-hours";
import {
  saveAiReplyExample,
  searchSimilarExamples,
  executeRAGPipeline,
  boostExampleQuality,
  penalizeExampleQuality,
  saveKnowledgeChunks,
  type RerankResult,
} from "@/lib/embedding";
import {
  fetchPatientMemory,
  extractAndSaveMemory,
  formatMemoryForPrompt,
  type PatientMemory,
} from "@/lib/ai-patient-memory";
import { classifyMessage, type ClassificationResult } from "@/lib/ai-reply-classify";
import { evaluatePolicy, savePolicyLog, type PolicyEvalResult } from "@/lib/ai-reply-policy";
import { fetchPatientState, formatStateForPrompt, type PatientState } from "@/lib/ai-patient-state";
import { TraceBuilder } from "@/lib/ai-reply-trace";
import { getRunningExperiment, selectVariant, assignDraftToExperiment } from "@/lib/ai-reply-experiment";
import {
  checkAiRateLimit,
  checkRepeatMessage,
  checkDailyCostLimit,
  isInCooldown,
} from "@/lib/ai-cost-guard";
import { resolveModelByRouting } from "@/lib/ai-model-routing";
import { searchReuseCandidate } from "@/lib/ai-semantic-reuse";
import { generateEscalationDetail } from "@/lib/ai-escalation";

const DEFAULT_DEBOUNCE_SEC = 15; // デフォルトのメッセージ待機時間（秒）
const DEFAULT_MODEL = "claude-sonnet-4-6";

/** テナントのAI返信設定からモデルIDを取得（デフォルト: claude-sonnet-4-6） */
export async function getAiReplyModel(tenantId: string | null): Promise<string> {
  try {
    const { data } = await withTenant(
      supabaseAdmin.from("ai_reply_settings").select("model_id").maybeSingle(),
      tenantId
    );
    return data?.model_id || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

interface AiReplyResult {
  category: "operational" | "medical" | "greeting" | "other";
  confidence: number;
  reply: string | null;
  reason: string;
}

/** 却下パターン（buildSystemPromptに渡す用） */
export interface RejectedDraftEntry {
  original_message: string;
  draft_reply: string | null;
  reject_category: RejectCategory | null;
  reject_reason: string | null;
}

/** 患者のフロー進行ステータス */
export interface PatientFlowStatus {
  hasRegisteredPersonalInfo: boolean;
  hasVerifiedPhone: boolean;
  hasCompletedQuestionnaire: boolean;
  intakeStatus: string | null;
  hasReservation: boolean;
  nextReservation: { date: string; time: string } | null;
  latestOrder: { paymentStatus: string; shippingStatus: string; paymentMethod: string } | null;
  activeReorder: { status: string; paid_at: string | null } | null;
  flowStage: string;
}

/** フローステージを判定 */
export function determineFlowStage(status: Omit<PatientFlowStatus, "flowStage">): string {
  if (status.latestOrder) {
    const { shippingStatus, paymentStatus } = status.latestOrder;
    if (shippingStatus === "shipped" || shippingStatus === "delivered") {
      if (status.activeReorder) {
        if (status.activeReorder.status === "paid") return "再処方決済完了・発送待ち";
        return status.activeReorder.status === "pending" ? "再処方申請中" : "再処方承認済み・決済待ち";
      }
      return "発送済み・再処方可能";
    }
    if (shippingStatus === "preparing") return "発送準備中";
    if (paymentStatus === "paid") return "決済済み・発送待ち";
  }
  if (status.intakeStatus === "OK") return "診察完了・決済待ち";
  if (status.intakeStatus === "NG") return "診察完了・処方不可";
  if (status.hasReservation && status.nextReservation) return "予約済み・診察待ち";
  if (status.hasCompletedQuestionnaire) return "問診完了・予約待ち";
  if (status.hasVerifiedPhone) return "問診未完了";
  if (status.hasRegisteredPersonalInfo) return "個人情報登録済み・電話番号認証待ち";
  return "友だち追加直後・個人情報未登録";
}

/** 患者ステータスをDBから取得 */
export async function fetchPatientFlowStatus(
  patientId: string,
  tenantId: string | null
): Promise<PatientFlowStatus> {
  try {
    const [patientRes, intakeRes, reservationRes, orderRes, reorderRes] = await Promise.all([
      withTenant(
        supabaseAdmin.from("patients").select("name, tel")
          .eq("patient_id", patientId)
          .maybeSingle(),
        tenantId
      ),
      withTenant(
        supabaseAdmin.from("intake").select("status, answers")
          .eq("patient_id", patientId)
          .not("answers", "is", null)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle(),
        tenantId
      ),
      withTenant(
        supabaseAdmin.from("reservations").select("reserved_date, reserved_time, status")
          .eq("patient_id", patientId)
          .neq("status", "canceled")
          .not("reserved_date", "is", null)
          .order("reserved_date", { ascending: true })
          .limit(1).maybeSingle(),
        tenantId
      ),
      withTenant(
        supabaseAdmin.from("orders").select("payment_status, shipping_status, payment_method")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle(),
        tenantId
      ),
      withTenant(
        supabaseAdmin.from("reorders").select("status, paid_at")
          .eq("patient_id", patientId)
          .in("status", ["pending", "confirmed", "paid"])
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle(),
        tenantId
      ),
    ]);

    const patient = patientRes.data as { name: string | null; tel: string | null } | null;
    const hasRegisteredPersonalInfo = !!patient?.name && patient.name.trim() !== "";
    const hasVerifiedPhone = !!patient?.tel && patient.tel.trim() !== "";

    const intake = intakeRes.data as { status: string | null; answers: Record<string, unknown> | null } | null;
    const answers = intake?.answers;
    const hasCompletedQuestionnaire = !!answers && typeof answers.ng_check === "string" && answers.ng_check !== "";

    const reservation = reservationRes.data as { reserved_date: string; reserved_time: string; status: string } | null;
    const order = orderRes.data as { payment_status: string; shipping_status: string; payment_method: string } | null;
    const reorder = reorderRes.data as { status: string; paid_at: string | null } | null;

    const partial = {
      hasRegisteredPersonalInfo,
      hasVerifiedPhone,
      hasCompletedQuestionnaire,
      intakeStatus: intake?.status ?? null,
      hasReservation: !!reservation,
      nextReservation: reservation ? { date: reservation.reserved_date, time: reservation.reserved_time } : null,
      latestOrder: order ? { paymentStatus: order.payment_status, shippingStatus: order.shipping_status, paymentMethod: order.payment_method } : null,
      activeReorder: reorder ? { status: reorder.status, paid_at: reorder.paid_at } : null,
    };

    return { ...partial, flowStage: determineFlowStage(partial) };
  } catch (err) {
    console.error("[AI Reply] 患者ステータス取得エラー:", err);
    return {
      hasRegisteredPersonalInfo: false,
      hasVerifiedPhone: false,
      hasCompletedQuestionnaire: false,
      intakeStatus: null,
      hasReservation: false,
      nextReservation: null,
      latestOrder: null,
      activeReorder: null,
      flowStage: "不明",
    };
  }
}

// システムプロンプト構築
export function buildSystemPrompt(
  knowledgeBase: string,
  customInstructions: string,
  rejectedDrafts?: RejectedDraftEntry[],
  similarExamples?: Array<{ question: string; answer: string; similarity?: number; relevance?: number }>,
  medicalReplyMode?: string,
  greetingReplyEnabled?: boolean,
  knowledgeChunks?: Array<{ title: string; content: string; similarity: number }>
): string {
  // 関連KBチャンクセクション（チャンキング版）
  let kbChunksSection = "";
  if (knowledgeChunks && knowledgeChunks.length > 0) {
    const entries = knowledgeChunks
      .map(c => `### ${c.title}\n${c.content}`)
      .join("\n\n");
    kbChunksSection = `\n\n## 関連するナレッジ（質問に関連する情報を自動抽出）\n${entries}`;
  }

  // 却下パターンセクション（末尾に追加）
  let rejectedSection = "";
  if (rejectedDrafts && rejectedDrafts.length > 0) {
    const entries = rejectedDrafts.map((d) => {
      const categoryLabel = d.reject_category
        ? rejectCategoryLabels[d.reject_category]
        : "理由なし";
      const reasonText = d.reject_reason ? `（${d.reject_reason}）` : "";
      return `- 元メッセージ: "${d.original_message}"\n  AI返信案: "${d.draft_reply || ""}"\n  却下理由: ${categoryLabel}${reasonText}`;
    }).join("\n\n");

    rejectedSection = `

## 過去の却下された返信例（同じ間違いを避けてください）

${entries}`;
  }

  // 類似学習例セクション
  let examplesSection = "";
  if (similarExamples && similarExamples.length > 0) {
    const entries = similarExamples.map((ex) =>
      `- Q: ${ex.question}\n  A: ${ex.answer}`
    ).join("\n\n");

    examplesSection = `

## スタッフの過去の返信例（この質問に類似する過去のやり取り）
以下はスタッフが実際に返信した内容です。口調・内容を参考にしてください。

${entries}`;
  }

  return `あなたはクリニックのLINEカスタマーサポートAIです。
患者からのメッセージを分析し、適切な返信案を生成してください。

## 役割
すべてのメッセージに対して返信案を生成します。
ただし、スタッフが承認してから送信されるため、100%正確でなくても大丈夫です。
過去のスタッフの返信の口調やスタイルを参考にして、自然な返信を心がけてください。
患者が複数メッセージに分けて送ってきた場合は、すべてのメッセージをまとめて1つの返信を生成してください。

## カテゴリ分類
メッセージを以下のカテゴリに分類してください:
- "operational": 予約・手続き・料金・営業時間・アクセス等のフロー系
- "medical": 薬の効果・副作用・症状・処方内容等の医学的質問
- "greeting": 挨拶・お礼・了解等の短い応答${greetingReplyEnabled ? "" : "（返信不要）"}
- "other": 上記に分類できないもの

## 対応方針
- **operational**: クリニック基本情報を参照して具体的に回答
- **medical**: ${medicalReplyMode === "direct" ? "過去のスタッフの返信を参考に、医学的質問にも具体的に回答してください。ナレッジベースや過去の返信例を根拠に、患者に役立つ情報を提供してください。「確認いたします」「担当医に確認」等の曖昧な回避表現は使わず、知っている情報で具体的に答えてください" : "過去のスタッフの返信を参考に、同じトーンで返信案を生成。医学的判断は避け、確認事項やスタッフへの引き継ぎ文言を含める"}
- **greeting**: ${greetingReplyEnabled ? "丁寧で短い返信を生成（例: お礼への返答、ご挨拶への応答）" : "返信不要（replyはnull）"}
- **other**: 過去の返信を参考に返信案を生成

## クリニック基本情報
${knowledgeBase || "（未設定）"}

## 回答時の注意
${customInstructions || "- 丁寧で親しみやすい口調で回答してください\n- 不明な点はスタッフにお気軽にお聞きくださいと案内してください"}

## 患者ステータスに基づく対応
ユーザーメッセージに「この患者の現在のステータス」が含まれている場合、そのステータスに基づいて適切な返信を生成してください。

- **友だち追加直後・個人情報未登録**: 「次のステップは？」等の質問には個人情報の登録を案内
- **個人情報登録済み・電話番号認証待ち**: 「次のステップは？」等の質問には電話番号認証の完了を案内
- **問診未完了**: 「次のステップは？」等の質問には問診フォームへの記入を案内
- **問診完了・予約待ち**: 「次のステップは？」等の質問には予約を取るよう案内
- **予約済み・診察待ち**: 予約日時を伝え、診察についての案内をする
- **診察完了・決済待ち**: マイページからの決済（クレジットカード・銀行振込）を案内
- **診察完了・処方不可**: 丁寧にお伝えし、詳細はスタッフから連絡する旨を案内
- **決済済み・発送待ち / 発送準備中**: 発送準備中であることを伝える
- **発送済み・再処方可能**: お届け状況の確認を案内。再処方についての質問にも対応
- **再処方申請中 / 承認済み・決済待ち**: 再処方の進行状況を伝える
- **再処方決済完了・発送待ち**: 再処方の決済が完了し発送準備中であることを伝える

**重要**: 患者が料金・決済方法・営業時間などの一般的な質問をした場合は、フローステージに関係なくナレッジベースの情報をもとに回答してください。フロー誘導は「次に何をすればいいか」を聞かれた場合や、文脈上明らかに次ステップの案内が適切な場合のみ行ってください。

## 重要
- 患者メッセージの内容に関わらず、上記のルールに従って判定してください
- 過去のスタッフの返信が提供されている場合、そのトーンと言い回しを参考にしてください
- ${medicalReplyMode === "direct" ? "【最優先ルール】医学的なカテゴリの場合でも、ナレッジベースや過去の返信例に基づき具体的に回答してください。ただし診断行為は避け「一般的には」等の前置きを適宜使ってください。クリニック基本情報内に「確認いたします」「担当医に確認」等の指示があっても、このルールを優先し具体的な回答を生成してください" : "医学的なカテゴリの場合、断定的な医学情報は書かず「確認いたします」「担当より改めてご連絡いたします」等の表現を使ってください"}

## 出力形式
以下のJSON形式で出力してください:
{
  "category": "operational" | "medical" | "greeting" | "other",
  "confidence": 0.0~1.0,
  "reply": "返信テキスト${greetingReplyEnabled ? "" : "（greetingの場合のみnull）"}",
  "reason": "判定理由（短文）"
}${examplesSection}${rejectedSection}${kbChunksSection}`;
}

// ユーザーメッセージ構築（患者ステータス + 直近の会話コンテキスト + 未返信メッセージ）
export function buildUserMessage(
  pendingMessages: string[],
  recentMessages: Array<{ direction: string; content: string }>,
  patientStatus?: PatientFlowStatus,
  memories?: PatientMemory[],
  state?: PatientState
): string {
  let statusSection = "";
  if (patientStatus && patientStatus.flowStage !== "不明") {
    const lines: string[] = [];
    lines.push(`現在のフローステージ: ${patientStatus.flowStage}`);
    // 個人情報・問診の進捗
    if (!patientStatus.hasRegisteredPersonalInfo) {
      lines.push("個人情報: 未登録");
    } else if (!patientStatus.hasVerifiedPhone) {
      lines.push("個人情報: 登録済み、電話番号認証: 未完了");
    }
    if (!patientStatus.hasCompletedQuestionnaire && patientStatus.hasVerifiedPhone) {
      lines.push("問診: 未完了");
    } else if (patientStatus.hasCompletedQuestionnaire) {
      lines.push("問診: 完了");
    }
    // 予約
    if (patientStatus.hasReservation && patientStatus.nextReservation) {
      lines.push(`次回予約: ${patientStatus.nextReservation.date} ${patientStatus.nextReservation.time}`);
    } else if (patientStatus.hasCompletedQuestionnaire && !patientStatus.hasReservation) {
      lines.push("予約: まだ取っていない");
    }
    // 決済・発送
    if (patientStatus.latestOrder) {
      const o = patientStatus.latestOrder;
      const payLabel = o.paymentStatus === "paid" ? "決済済み" : o.paymentStatus === "pending" ? "未決済" : o.paymentStatus;
      const shipLabel = o.shippingStatus === "shipped" ? "発送済み" : o.shippingStatus === "delivered" ? "配達済み" : o.shippingStatus === "preparing" ? "発送準備中" : o.shippingStatus === "pending" ? "未発送" : o.shippingStatus;
      const methodLabel = o.paymentMethod === "credit_card" ? "クレジットカード" : o.paymentMethod === "bank_transfer" ? "銀行振込" : o.paymentMethod || "不明";
      lines.push(`最新注文: ${payLabel}（${methodLabel}）、${shipLabel}`);
    }
    // 再処方
    if (patientStatus.activeReorder) {
      const r = patientStatus.activeReorder;
      lines.push(`再処方: ${r.status === "pending" ? "申請中（承認待ち）" : r.status === "confirmed" ? "承認済み（決済待ち）" : r.status === "paid" ? "決済完了（発送待ち）" : r.status}`);
    }
    statusSection = "## この患者の現在のステータス\n" + lines.join("\n") + "\n\n";
  }

  let context = "";
  if (recentMessages.length > 0) {
    context = "## 直近の会話（参考: スタッフの返信トーンを真似してください）\n" + recentMessages.map(m =>
      `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content}`
    ).join("\n") + "\n\n";
  }
  // 患者メモリセクション
  let memorySection = "";
  if (memories && memories.length > 0) {
    memorySection = formatMemoryForPrompt(memories) + "\n\n";
  }

  // 患者状態セクション
  let stateSection = "";
  if (state) {
    stateSection = formatStateForPrompt(state) + "\n\n";
  }

  const msgs = pendingMessages.length === 1
    ? pendingMessages[0]
    : pendingMessages.map((m, i) => `(${i + 1}) ${m}`).join("\n");
  return `${statusSection}${stateSection}${memorySection}${context}## 患者からの新しいメッセージ\n${msgs}`;
}

/** Redis に保存するデバウンス情報 */
interface DebounceEntry {
  lineUid: string;
  patientId: string;
  patientName: string;
  tenantId: string | null;
  ts: number; // タイムスタンプ（ms）
}

/**
 * AI返信をスケジュール（Redis保存のみ、即return）
 * webhookから呼ばれ、Redisにデバウンスマーカーを保存。
 * 実際のAI処理は cron（/api/cron/ai-reply）が毎分実行する。
 */
export async function scheduleAiReply(
  lineUid: string,
  patientId: string,
  patientName: string,
  messageText: string,
  tenantId: string | null
): Promise<void> {
  // フィルタリング（短文・絵文字等）
  const { data: settings } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("*").maybeSingle(),
    tenantId
  );
  if (!settings?.is_enabled) {
    console.log(`[AI Reply] scheduleAiReply スキップ: settings無効 (settings=${JSON.stringify(settings ? { is_enabled: settings.is_enabled } : null)})`);
    return;
  }

  const filterResult = shouldProcessWithAI(messageText, "text", settings);
  if (!filterResult.process) {
    console.log(`[AI Reply] スキップ: ${filterResult.reason}`);
    return;
  }

  // レート制限チェック（30秒3通/1時間30通）
  if (settings.spam_filter_enabled !== false) {
    const rateResult = await checkAiRateLimit(tenantId, patientId, settings);
    if (rateResult.blocked) {
      console.log(`[AI Reply] レート制限ブロック: ${patientId} (${rateResult.reason})`);
      return;
    }

    // 同一文連投チェック（2分以内に3回同一でブロック）
    const repeatResult = await checkRepeatMessage(tenantId, patientId, messageText);
    if (repeatResult.blocked) {
      console.log(`[AI Reply] 同一文連投ブロック: ${patientId}`);
      return;
    }
  }

  // Redisにデバウンス情報を保存（cronが後で取得する）
  const debounceKey = `ai_debounce:${patientId}`;
  const entry: DebounceEntry = {
    lineUid,
    patientId,
    patientName,
    tenantId,
    ts: Date.now(),
  };
  try {
    await redis.set(debounceKey, JSON.stringify(entry), { ex: 120 }); // cronが60秒間隔なので余裕を持って120秒
    // デバウンスキーの一覧管理用セットにも追加
    await redis.sadd("ai_debounce_keys", patientId);
  } catch (e) {
    console.error("[AI Reply] Redis set error:", e);
    return;
  }

  const debounceSec = settings.debounce_sec || DEFAULT_DEBOUNCE_SEC;
  console.log(`[AI Reply] デバウンス登録: ${patientId}（cronが${debounceSec}秒後に処理）`);
}

/**
 * ロック競合時にcronへ委任するためデバウンスキーを再登録（フィルターなし）
 */
export async function rescheduleAiReply(
  lineUid: string,
  patientId: string,
  patientName: string,
  tenantId: string | null
): Promise<void> {
  const debounceKey = `ai_debounce:${patientId}`;
  const entry: DebounceEntry = { lineUid, patientId, patientName, tenantId, ts: Date.now() };
  try {
    await redis.set(debounceKey, JSON.stringify(entry), { ex: 120 });
    await redis.sadd("ai_debounce_keys", patientId);
    console.log(`[AI Reply] cronへ再委任: ${patientId}`);
  } catch (e) {
    console.error("[AI Reply] 再委任Redis setエラー:", e);
  }
}

/**
 * after() で直接処理した後、Redisデバウンスキーを削除してcron重複を防止
 */
export async function clearAiReplyDebounce(patientId: string): Promise<void> {
  try {
    await redis.del(`ai_debounce:${patientId}`);
    await redis.srem("ai_debounce_keys", patientId);
  } catch (e) {
    console.error("[AI Reply] デバウンスキー削除エラー:", e);
  }
}

/**
 * cronから呼ばれる: デバウンス期間が経過したエントリを処理
 */
export async function processPendingAiReplies(): Promise<number> {
  let processed = 0;

  try {
    // デバウンスキー一覧を取得
    const patientIds = await redis.smembers("ai_debounce_keys");
    if (!patientIds || patientIds.length === 0) return 0;

    const now = Date.now();

    for (const patientId of patientIds) {
      const debounceKey = `ai_debounce:${patientId}`;
      const raw = await redis.get<string>(debounceKey);
      if (!raw) {
        // キーが消えている（TTL切れ等）→ セットから除去
        await redis.srem("ai_debounce_keys", patientId);
        continue;
      }

      let entry: DebounceEntry;
      try {
        entry = typeof raw === "string" ? JSON.parse(raw) : raw as unknown as DebounceEntry;
      } catch {
        await redis.del(debounceKey);
        await redis.srem("ai_debounce_keys", patientId);
        continue;
      }

      // デバウンス期間経過していなければスキップ（設定値 or デフォルト15秒）
      // テナント設定を取得してdebounce_secを読む
      let debounceSec = DEFAULT_DEBOUNCE_SEC;
      try {
        const { data: s } = await withTenant(
          supabaseAdmin.from("ai_reply_settings").select("debounce_sec").maybeSingle(),
          entry.tenantId
        );
        if (s?.debounce_sec) debounceSec = s.debounce_sec;
      } catch { /* フォールバック */ }
      if (now - entry.ts < debounceSec * 1000) continue;

      // デバウンス通過 → マーカー削除してAI処理実行
      await redis.del(debounceKey);
      await redis.srem("ai_debounce_keys", patientId);

      console.log(`[AI Reply] デバウンス通過: ${patientId}（${Math.round((now - entry.ts) / 1000)}秒経過）`);

      try {
        await processAiReply(entry.lineUid, entry.patientId, entry.patientName, entry.tenantId, entry.ts);
        processed++;
      } catch (err) {
        console.error(`[AI Reply] 処理エラー: ${patientId}`, err);
      }
    }
  } catch (err) {
    console.error("[AI Reply] cron処理エラー:", err);
  }

  return processed;
}

// デバッグ用: 最後の処理結果を保持
export let lastProcessLog: string[] = [];

/** AI返信のメイン処理（デバウンス後に呼ばれる） */
export async function processAiReply(
  lineUid: string,
  patientId: string,
  patientName: string,
  tenantId: string | null,
  receivedAt?: number
): Promise<void> {
  const log: string[] = [];
  lastProcessLog = log;
  const tid = tenantId ?? undefined;

  // LINE_仮IDが統合済みの場合、最新のpatient_idを再取得
  if (patientId.startsWith("LINE_")) {
    const { data: current } = await withTenant(
      supabaseAdmin.from("patients").select("patient_id, name")
        .eq("line_id", lineUid).maybeSingle(),
      tenantId
    );
    if (current && !current.patient_id.startsWith("LINE_")) {
      log.push(`patientId統合検出: ${patientId} → ${current.patient_id}`);
      console.log(`[AI Reply] patientId統合検出: ${patientId} → ${current.patient_id}`);
      patientId = current.patient_id;
      if (current.name) patientName = current.name;
    }
  }

  // 0.3. タイピングインジケーター表示（AI処理中を示す）
  import("@/lib/line-push").then(({ showLoadingAnimation }) =>
    showLoadingAnimation(lineUid, 30, tid).catch(() => {}),
  );

  // 0.5. cooldownチェック（レート制限でブロックされた患者）
  const cooldownActive = await isInCooldown(tenantId, patientId);
  if (cooldownActive) {
    log.push("skip: cooldown中");
    console.log(`[AI Reply] cooldown中: ${patientId}`);
    return;
  }

  // 1. AI返信設定を取得
  log.push("step1: settings取得");
  const { data: settings } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("*").maybeSingle(),
    tenantId
  );
  if (!settings?.is_enabled) { log.push("skip: settings無効"); return; }
  log.push("step1: OK");

  // 1.2. 営業時間チェック
  log.push("step1.2: 営業時間チェック");
  const { withinHours, outsideMessage } = await isWithinBusinessHours(tenantId);
  if (!withinHours) {
    log.push("skip: 営業時間外");
    console.log(`[AI Reply] 営業時間外: ${patientId}`);
    // 営業時間外メッセージが設定されていれば自動送信
    if (outsideMessage) {
      try {
        await pushMessage(lineUid, [{ type: "text", text: outsideMessage }], tenantId ?? undefined);
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: patientId,
          line_uid: lineUid,
          direction: "outgoing",
          event_type: "auto_reply",
          message_type: "individual",
          content: outsideMessage,
          status: "sent",
        });
        log.push("step1.2: 営業時間外メッセージ送信完了");
      } catch (e) {
        console.error("[AI Reply] 営業時間外メッセージ送信エラー:", e);
      }
    }
    return;
  }
  log.push("step1.2: 営業時間内OK");

  // 1.5. 日次上限チェック
  log.push("step1.5: 日次上限チェック");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    tenantId
  );
  if ((todayCount || 0) >= (settings.daily_limit || 100)) {
    log.push(`skip: 日次上限到達 ${todayCount}/${settings.daily_limit}`);
    console.log(`[AI Reply] 日次上限到達: ${todayCount}/${settings.daily_limit}`);
    return;
  }
  log.push(`step1.5: OK (${todayCount}/${settings.daily_limit})`);

  // 1.6. 日次コスト上限チェック（tenant単位）
  log.push("step1.6: コスト上限チェック");
  const costResult = await checkDailyCostLimit(tenantId, settings);
  if (costResult.blocked) {
    log.push(`skip: 日次コスト上限到達`);
    console.log(`[AI Reply] 日次コスト上限到達: tenant=${tenantId}`);
    return;
  }
  log.push("step1.6: OK");

  // 2. APIキーを取得
  log.push("step2: APIキー取得");
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY")) || "";
  if (!apiKey) {
    log.push("skip: APIキー未設定");
    console.error("[AI Reply] ANTHROPIC_API_KEY 未設定");
    return;
  }
  log.push(`step2: OK (key長=${apiKey.length})`);

  // 3. 既存のpendingドラフトをキャンセル（追加メッセージによる再生成）
  await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .update({ status: "expired" })
      .eq("patient_id", patientId)
      .eq("status", "pending"),
    tenantId
  );

  // 4. 直近の会話コンテキスト + 患者ステータス + 患者メモリ + 状態を並列取得
  log.push("step4: 会話コンテキスト+患者ステータス+メモリ+状態取得");
  const [{ data: recentMsgs }, patientStatus, patientMemories, patientState] = await Promise.all([
    withTenant(
      supabaseAdmin
        .from("message_log")
        .select("direction, content, event_type, sent_at")
        .eq("patient_id", patientId)
        .in("event_type", ["message", "auto_reply", "ai_reply"])
        .order("sent_at", { ascending: false })
        .limit(15),
      tenantId
    ),
    fetchPatientFlowStatus(patientId, tenantId),
    fetchPatientMemory(patientId, tenantId),
    fetchPatientState(patientId, tenantId),
  ]);
  log.push(`step4: flowStage=${patientStatus.flowStage}, memories=${patientMemories.length}, state=${patientState.current_state}`);

  // トレースビルダー初期化
  const trace = new TraceBuilder();
  trace.setBase(tenantId, patientId);
  trace.setPatientState(patientState as unknown as Record<string, unknown>);

  const sorted = (recentMsgs || []).reverse();

  // 5. 最後のoutgoing以降の未返信incomingメッセージを収集
  let lastOutgoingIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].direction === "outgoing") {
      lastOutgoingIdx = i;
      break;
    }
  }
  const pendingMessagesWithTime = sorted
    .slice(lastOutgoingIdx + 1)
    .filter(m => m.direction === "incoming")
    .map(m => ({ content: m.content, sent_at: m.sent_at as string }));
  const pendingMessages = pendingMessagesWithTime.map(m => m.content);

  if (pendingMessages.length === 0) {
    log.push("skip: 未返信メッセージなし");
    console.log(`[AI Reply] 未返信メッセージなし: ${patientId}`);
    return;
  }
  log.push(`step5: pending=${pendingMessages.length}件`);

  // 会話コンテキスト（最後のoutgoingまで）
  const contextMessages = lastOutgoingIdx >= 0 ? sorted.slice(0, lastOutgoingIdx + 1) : [];

  // 5.5. 直近の却下パターンを取得（最新10件）
  log.push("step5.5: 却下パターン取得");
  const { data: rejectedDrafts } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("original_message, draft_reply, reject_category, reject_reason")
      .eq("status", "rejected")
      .order("rejected_at", { ascending: false })
      .limit(10),
    tenantId
  );
  log.push(`step5.5: ${rejectedDrafts?.length ?? 0}件の却下パターン`);

  // 5.6. 実験チェック（running実験があればconfig上書き）
  let experimentInfo: { experimentId: number; variantKey: string } | null = null;
  const experiment = await getRunningExperiment(tenantId);
  if (experiment) {
    const { variantKey, config } = selectVariant(experiment);
    experimentInfo = { experimentId: experiment.id, variantKey };
    if (config.rag_similarity_threshold != null) settings.rag_similarity_threshold = config.rag_similarity_threshold;
    if (config.rag_max_examples != null) settings.rag_max_examples = config.rag_max_examples;
    if (config.rag_max_kb_chunks != null) settings.rag_max_kb_chunks = config.rag_max_kb_chunks;
    if (config.model_id) settings.model_id = config.model_id;
    log.push(`step5.6: 実験 ${experiment.experiment_name} → ${variantKey}`);
  }

  // 5.7. RAGパイプライン実行（Query Rewriting → Hybrid Search → Reranking + KB チャンク検索）
  log.push("step5.7: RAGパイプライン実行");
  const ragResult = await executeRAGPipeline({
    pendingMessages,
    contextMessages,
    tenantId,
    knowledgeBase: settings.knowledge_base || "",
    ragConfig: {
      similarityThreshold: settings.rag_similarity_threshold ?? undefined,
      maxExamples: settings.rag_max_examples ?? undefined,
      maxKbChunks: settings.rag_max_kb_chunks ?? undefined,
    },
  });
  log.push(`step5.7: examples=${ragResult.examples.length}, kb_chunks=${ragResult.knowledgeChunks.length}, query="${ragResult.rewrittenQuery.slice(0, 50)}"`);
  trace.setRewrittenQuery(ragResult.rewrittenQuery);
  trace.setExamples(
    ragResult.examples as unknown as Array<Record<string, unknown>>,
    ragResult.examples as unknown as Array<Record<string, unknown>>
  );
  trace.setChunks(ragResult.knowledgeChunks as unknown as Array<Record<string, unknown>>);

  // 6A. 分類ステージ（Haiku高速分類）
  const client = new Anthropic({ apiKey });
  const baseSonnetModelId = settings.model_id || DEFAULT_MODEL;
  const greetingReplyEnabled = !!settings.greeting_reply_enabled;
  let classificationResult: ClassificationResult | null = null;
  let classificationTokens = 0;

  log.push("step6A: 分類ステージ");
  try {
    const classifyResult = await classifyMessage({
      apiKey,
      messages: pendingMessages,
      contextMessages,
      greetingReplyEnabled,
    });
    classificationResult = classifyResult.result;
    classificationTokens = classifyResult.inputTokens + classifyResult.outputTokens;
    log.push(`step6A: category=${classificationResult.category}, should_reply=${classificationResult.should_reply}, escalate=${classificationResult.escalate_to_staff}, topics=[${classificationResult.key_topics.join(",")}]`);

    trace.setClassification(classificationResult as unknown as Record<string, unknown>);

    // 分類で返信不要と判断された場合のスキップ判定
    if (!classificationResult.should_reply) {
      // 医療系で直接回答モードの場合はスキップせずドラフト生成を継続
      const isMedicalDirect = classificationResult.category === "medical" && settings.medical_reply_mode === "direct";
      // エスカレーション対象はドラフト生成して承認に回す
      const isEscalation = classificationResult.escalate_to_staff;

      // greeting + greeting_reply_enabled の場合もドラフト生成を継続
      const isGreetingEnabled = classificationResult.category === "greeting" && settings.greeting_reply_enabled;

      if (isMedicalDirect || isEscalation || isGreetingEnabled) {
        classificationResult.should_reply = true;
        log.push(`step6A: should_reply=falseを上書き (medical_direct=${isMedicalDirect}, escalation=${isEscalation}, greeting_enabled=${isGreetingEnabled})`);
      } else {
        log.push(`skip: 分類で返信不要 (category=${classificationResult.category}, reason=${classificationResult.reasoning})`);
        console.log(`[AI Reply] 分類で返信不要: ${classificationResult.reasoning}`);
        return;
      }
    }
  } catch (err) {
    // 分類失敗時は従来の単一呼び出しにフォールバック
    log.push(`step6A: 分類失敗、フォールバック: ${err}`);
    console.warn("[AI Reply] 分類ステージ失敗、従来方式にフォールバック:", err);
  }

  // 6A-2. ポリシー評価（分類結果がある場合のみ）
  let policyResult: PolicyEvalResult | null = null;
  let escalationDetail: Record<string, unknown> | null = null;
  if (classificationResult) {
    log.push("step6A-2: ポリシー評価");
    policyResult = await evaluatePolicy(classificationResult, tenantId);
    log.push(`step6A-2: decision=${policyResult.decision}, hits=${policyResult.ruleHits.length}`);
    trace.setPolicy(policyResult as unknown as Record<string, unknown>);

    if (policyResult.decision === "block") {
      log.push(`skip: ポリシーブロック (reason=${policyResult.escalationReason})`);
      console.log(`[AI Reply] ポリシーブロック: ${policyResult.escalationReason}`);
      return;
    }

    // escalate_to_staffの場合もドラフト生成は行う（承認必須として処理）
    if (policyResult.decision === "escalate_to_staff") {
      log.push("step6A-2: エスカレーション → 承認必須モードに強制切替");

      // エスカレーション詳細を生成（Haiku）
      try {
        const escResult = await generateEscalationDetail({
          apiKey,
          messages: pendingMessages,
          contextMessages,
          classificationResult,
          patientName,
        });
        if (escResult) {
          escalationDetail = escResult.detail as unknown as Record<string, unknown>;
          // inputTokens/outputTokensは後段で宣言されるため、escalationのトークン数はログのみ
          log.push(`step6A-2: escalation detail generated (urgency=${escalationDetail.urgency}, team=${escalationDetail.escalation_team}, tokens=${escResult.inputTokens}+${escResult.outputTokens})`);
        }
      } catch (e) {
        console.error("[AI Reply] escalation detail生成エラー:", e);
      }
    }
  }

  // 6A-2.5. Semantic Reuse（過去承認済み回答の再利用チェック）
  let reuseResult: { found: boolean; candidate: { exampleId: number; answer: string; similarity: number } | null; reason: string } | null = null;
  if (classificationResult) {
    log.push("step6A-2.5: Semantic Reuse チェック");
    const { searchReuseCandidate: searchReuse } = await import("@/lib/ai-semantic-reuse");
    reuseResult = await searchReuse({
      queryText: pendingMessages.join("\n"),
      tenantId,
      aiCategory: classificationResult.category,
    });
    if (reuseResult.found && reuseResult.candidate) {
      log.push(`step6A-2.5: reuse hit (example_id=${reuseResult.candidate.exampleId}, similarity=${reuseResult.candidate.similarity})`);
      console.log(`[AI Reply] Semantic Reuse hit: example=${reuseResult.candidate.exampleId}, similarity=${reuseResult.candidate.similarity.toFixed(3)}`);
    } else {
      log.push(`step6A-2.5: reuse miss (reason=${reuseResult.reason})`);
    }
  }

  // 6A-3. Case Routing（モデル振り分け）
  const routingDecision = resolveModelByRouting(
    classificationResult, baseSonnetModelId, !!settings.case_routing_enabled
  );
  const modelId = routingDecision.modelId;
  log.push(`step6A-3: routing=${routingDecision.routingReason}, model=${modelId}, isHaiku=${routingDecision.isHaikuRouted}`);

  // 6B. 生成ステージ（メインモデルで返信生成）
  const systemPrompt = buildSystemPrompt(
    settings.knowledge_base || "",
    settings.custom_instructions || "",
    (rejectedDrafts as RejectedDraftEntry[] | null) ?? undefined,
    ragResult.examples,
    settings.medical_reply_mode || "confirm",
    greetingReplyEnabled,
    ragResult.knowledgeChunks
  );
  const userMessage = buildUserMessage(pendingMessages, contextMessages, patientStatus, patientMemories, patientState);

  let aiResult: AiReplyResult;
  let inputTokens = 0;
  let outputTokens = 0;

  // Semantic Reuse hit時はLLM生成をスキップ
  if (reuseResult?.found && reuseResult.candidate) {
    aiResult = {
      category: classificationResult?.category || "other",
      reply: reuseResult.candidate.answer,
      confidence: reuseResult.candidate.similarity,
      reason: "Semantic Reuse（過去承認済み回答の再利用）",
    };
    inputTokens = 0;
    outputTokens = 0;
    log.push("step6B: スキップ（Semantic Reuse）");
  } else {
    // 既存のstep6B生成ロジック
    log.push(`step6B: 生成ステージ (model=${modelId})`);
    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      log.push(`step6B: レスポンス取得 (tokens: ${inputTokens}/${outputTokens})`);
      log.push(`step6B: raw=${text.substring(0, 200)}`);
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) throw new Error("AIレスポンスにJSONが含まれていません");
      aiResult = JSON.parse(jsonMatch[1]);
      // 分類結果がある場合はカテゴリを上書き（分類の方が信頼性高い）
      if (classificationResult) {
        aiResult.category = classificationResult.category;
        aiResult.confidence = Math.max(aiResult.confidence, classificationResult.confidence);
      }
      log.push(`step6B: category=${aiResult.category}, confidence=${aiResult.confidence}`);
      trace.setModel(modelId, text.substring(0, 500));
      trace.setPrompts(systemPrompt, userMessage);
    } catch (err) {
      log.push(`error: Claude API失敗: ${err}`);
      console.error("[AI Reply] Claude API エラー:", err);
      return;
    }
  } // end of reuse else

  // 7. greeting/返信不要はスキップ（greeting_reply_enabled時はgreetingも処理）
  const skipGreeting = aiResult.category === "greeting" && !greetingReplyEnabled;
  if (skipGreeting || !aiResult.reply) {
    log.push(`skip: category=${aiResult.category}, reason=${aiResult.reason}, greetingReplyEnabled=${greetingReplyEnabled}`);
    console.log(`[AI Reply] category=${aiResult.category}, スキップ: ${aiResult.reason}`);
    return;
  }

  // 7.5. Handoff Summary 生成（Haiku）
  let handoffSummary = null;
  try {
    const handoffClient = new Anthropic({ apiKey });
    const handoffResponse = await handoffClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 384,
      system: `クリニックのLINE問い合わせに対するスタッフ引継ぎ情報を生成してください。
JSON形式で出力:
{
  "conversation_summary": "会話の要約（2-3文）",
  "patient_context": "患者の現在の状態（フロー段階やメモリからの情報）",
  "ai_reasoning": "AIがこの返信案を生成した根拠",
  "suggested_actions": ["スタッフへの推奨アクション1", "アクション2"]
}`,
      messages: [{
        role: "user",
        content: `患者名: ${patientName}
患者メッセージ: ${pendingMessages.join("\n")}
AI返信案: ${aiResult.reply || "（なし）"}
分類: ${classificationResult?.category || "不明"}
${patientStatus ? `患者ステータス: ${patientStatus.flowStage}` : ""}`,
      }],
    });
    const handoffText = handoffResponse.content[0].type === "text" ? handoffResponse.content[0].text : "";
    const handoffMatch = handoffText.match(/\{[\s\S]*\}/);
    if (handoffMatch) {
      handoffSummary = JSON.parse(handoffMatch[0]);
    }
    inputTokens += handoffResponse.usage.input_tokens;
    outputTokens += handoffResponse.usage.output_tokens;
    log.push("step7.5: handoff summary generated");
  } catch (e) {
    console.error("[AI Reply] handoff summary生成エラー:", e);
    log.push("step7.5: handoff summary生成失敗（続行）");
  }

  // 8. 返信案をDBに保存
  log.push("step8: DB保存");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (settings.approval_timeout_hours || 24));
  const originalMessage = pendingMessages.join("\n");

  const insertPayload = {
    ...tenantPayload(tenantId),
    patient_id: patientId,
    line_uid: lineUid,
    original_message: originalMessage,
    ai_category: aiResult.category,
    draft_reply: aiResult.reply,
    confidence: aiResult.confidence,
    status: (settings.mode === "auto" && (!policyResult || policyResult.decision === "auto_reply_ok")) ? "approved" : "pending",
    model_used: modelId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    expires_at: expiresAt.toISOString(),
    // 根拠保存（Phase 1-1）
    retrieved_example_ids: ragResult.usedExampleIds || [],
    retrieved_chunks: ragResult.knowledgeChunks || [],
    rewritten_query: ragResult.rewrittenQuery || "",
    // Evals基盤（Phase 1-2）
    message_received_at: receivedAt ? new Date(receivedAt).toISOString() : null,
    // Two-Stage分離（Phase 2-1）
    classification_result: classificationResult || null,
    classification_model: classificationResult ? "claude-haiku-4-5-20251001" : null,
    classification_tokens: classificationTokens,
    // Case Routing（Month 1）
    routing_reason: routingDecision.routingReason,
    // Escalation + Handoff（Month 3）
    escalation_detail: escalationDetail || null,
    handoff_summary: handoffSummary || null,
    // Semantic Reuse（Month 2）
    reuse_source_example_id: reuseResult?.candidate?.exampleId || null,
    reuse_similarity: reuseResult?.candidate?.similarity || null,
    // Policy Engine（Phase 2-3）
    policy_decision: policyResult?.decision || null,
    policy_rule_hits: policyResult?.ruleHits || [],
    escalation_reason: policyResult?.escalationReason || null,
  };

  const { data: draft, error: insertError } = await supabaseAdmin
    .from("ai_reply_drafts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !draft) {
    log.push(`error: DB保存失敗: ${JSON.stringify(insertError)}`);
    console.error("[AI Reply] 返信案保存エラー:", insertError);
    return;
  }
  log.push(`step8: OK (draft_id=${draft.id})`);
  trace.setDraftId(draft.id);

  // 8.5. トレース+ポリシーログ+実験割当保存
  trace.save().catch(err => console.error("[AI Reply] トレース保存エラー:", err));
  if (experimentInfo) {
    assignDraftToExperiment({
      tenantId,
      draftId: draft.id,
      experimentId: experimentInfo.experimentId,
      variantKey: experimentInfo.variantKey,
    }).catch(err => console.error("[AI Reply] 実験割当保存エラー:", err));
  }
  if (policyResult && policyResult.ruleHits.length > 0) {
    savePolicyLog({ tenantId, draftId: draft.id, patientId, evalResult: policyResult })
      .catch(err => console.error("[AI Reply] ポリシーログ保存エラー:", err));
  }

  // 9. モードに応じた処理
  const effectiveMode = (settings.mode === "auto" && (!policyResult || policyResult.decision === "auto_reply_ok"))
    ? "auto" : "approval";
  log.push(`step9: mode=${settings.mode}, effectiveMode=${effectiveMode}`);
  if (effectiveMode === "auto") {
    await sendAiReply(draft.id, lineUid, aiResult.reply, patientId, tenantId);
    log.push("step9: auto送信完了");
  } else {
    // origin: テナント設定のapp_base_url優先、なければVercelホスト名
    const origin = (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tid))
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
    await sendApprovalFlexMessage(
      draft.id, patientId, patientName,
      originalMessage, aiResult.reply, aiResult.confidence,
      aiResult.category, tid, origin, pendingMessagesWithTime
    );
    log.push("step9: 承認Flex送信完了");
  }

  // 10. 患者メモリ抽出（非同期・fire-and-forget）
  extractAndSaveMemory({
    patientId,
    tenantId,
    messages: pendingMessages,
    aiReply: aiResult.reply,
  }).catch(err => console.error("[AI Reply] メモリ抽出エラー:", err));
}

/** AI返信を実送信 */
export async function sendAiReply(
  draftId: number,
  lineUid: string,
  replyText: string,
  patientId: string,
  tenantId: string | null
): Promise<void> {
  // LINE_仮IDが統合済みの場合、正式IDに解決（message_logの整合性確保）
  if (patientId.startsWith("LINE_")) {
    const { data: current } = await withTenant(
      supabaseAdmin.from("patients").select("patient_id")
        .eq("line_id", lineUid).maybeSingle(),
      tenantId
    );
    if (current && !current.patient_id.startsWith("LINE_")) {
      console.log(`[AI Reply] sendAiReply patientId統合: ${patientId} → ${current.patient_id}`);
      patientId = current.patient_id;
    }
  }

  const res = await pushMessage(
    lineUid,
    [{ type: "text", text: replyText }],
    tenantId ?? undefined
  );
  const ok = res?.ok ?? false;

  await supabaseAdmin
    .from("ai_reply_drafts")
    .update({
      status: ok ? "sent" : "pending",
      sent_at: ok ? new Date().toISOString() : null,
    })
    .eq("id", draftId);

  if (ok) {
    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "ai_reply",
      message_type: "individual",
      content: replyText,
      status: "sent",
    });

    // AI返信送信後、未読マークを消す（outgoingメッセージなので既読扱い）
    await supabaseAdmin
      .from("chat_reads")
      .upsert(
        { ...tenantPayload(tenantId), patient_id: patientId, read_at: new Date().toISOString() },
        { onConflict: "patient_id" }
      );
  }
}

/**
 * スタッフがトーク画面から手動返信した場合の暗黙フィードバック処理
 * - 同一患者の pending AI ドラフトを「暗黙の却下」として expired に更新
 * - スタッフの手動返信を正解例としてナレッジベースに追記
 * 使用箇所: app/api/admin/line/send/route.ts（個別メッセージ送信後）
 */
export async function handleImplicitAiFeedback(
  patientId: string,
  staffReply: string,
  tenantId: string | null
): Promise<void> {
  try {
    // 同一患者の pending ドラフトを取得
    const { data: pendingDrafts } = await withTenant(
      supabaseAdmin
        .from("ai_reply_drafts")
        .select("id, original_message, draft_reply")
        .eq("patient_id", patientId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      tenantId
    );

    if (pendingDrafts && pendingDrafts.length > 0) {
      // pending ドラフトを expired（暗黙の却下）に更新
      const draftIds = pendingDrafts.map((d: { id: number }) => d.id);
      await supabaseAdmin
        .from("ai_reply_drafts")
        .update({
          status: "expired",
          reject_category: "other",
          reject_reason: "スタッフが手動返信（暗黙の却下）",
        })
        .in("id", draftIds);

      // 直近のドラフトの元メッセージのみスタッフ返信と紐づけて学習
      // ※ 複数pendingがある場合、古いドラフトのQは現在のスタッフ返信と対応しない可能性が高い
      // （例: 患者が「予約変更したい」→「薬の残りが少ない」と2通送った場合、
      //  スタッフ返信は直近の質問への回答である可能性が高い）
      const latestDraft = pendingDrafts[0]; // created_at DESC で取得済み
      if (latestDraft.original_message && staffReply) {
        await saveAiReplyExample({
          tenantId,
          question: latestDraft.original_message,
          answer: staffReply,
          source: "manual_reply",
          draftId: latestDraft.id,
        });
      }
      // 古いドラフトは品質スコアをペナライズ（AIが的外れだったため手動返信された）
      for (const draft of pendingDrafts.slice(1)) {
        penalizeExampleQuality(draft.id, "off_topic").catch(() => {});
      }

      console.log(`[AI Reply] 暗黙フィードバック: patient=${patientId}, drafts=${draftIds.length}件をexpired化`);
    } else {
      // ドラフトなし（AI提案が未生成 or 既に処理済み）→ 患者の直近メッセージを取得して学習
      const { data: recentMessages } = await withTenant(
        supabaseAdmin
          .from("message_log")
          .select("content, direction")
          .eq("patient_id", patientId)
          .eq("direction", "incoming")
          .order("sent_at", { ascending: false })
          .limit(3),
        tenantId
      );

      const patientMessage = recentMessages
        ?.map((m: { content: string }) => m.content)
        .reverse()
        .join("\n");

      if (patientMessage && staffReply) {
        await saveAiReplyExample({
          tenantId,
          question: patientMessage,
          answer: staffReply,
          source: "manual_reply",
        });
        console.log(`[AI Reply] ドラフトなし直接返信を学習: patient=${patientId}`);
      }
    }
  } catch (err) {
    // fire-and-forget: エラーがあっても送信処理を止めない
    console.error("[AI Reply] 暗黙フィードバックエラー:", err);
  }
}
