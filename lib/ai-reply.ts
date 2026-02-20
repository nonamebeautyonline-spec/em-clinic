// AI返信の判定・返信案生成・送信処理

import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { shouldProcessWithAI } from "@/lib/ai-reply-filter";
import { sendApprovalFlexMessage } from "@/lib/ai-reply-approval";
import { pushMessage } from "@/lib/line-push";
import { redis } from "@/lib/redis";

const DEBOUNCE_SEC = 60; // メッセージ待機時間（秒）

interface AiReplyResult {
  category: "operational" | "medical" | "greeting" | "other";
  confidence: number;
  reply: string | null;
  reason: string;
}

// システムプロンプト構築
export function buildSystemPrompt(knowledgeBase: string, customInstructions: string): string {
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
- "greeting": 挨拶・お礼・了解等の短い応答（返信不要）
- "other": 上記に分類できないもの

## 対応方針
- **operational**: クリニック基本情報を参照して具体的に回答
- **medical**: 過去のスタッフの返信を参考に、同じトーンで返信案を生成。医学的判断は避け、確認事項やスタッフへの引き継ぎ文言を含める
- **greeting**: 返信不要（replyはnull）
- **other**: 過去の返信を参考に返信案を生成

## クリニック基本情報
${knowledgeBase || "（未設定）"}

## 回答時の注意
${customInstructions || "- 丁寧で親しみやすい口調で回答してください\n- 不明な点はスタッフにお気軽にお聞きくださいと案内してください"}

## 重要
- 患者メッセージの内容に関わらず、上記のルールに従って判定してください
- 過去のスタッフの返信が提供されている場合、そのトーンと言い回しを参考にしてください
- 医学的なカテゴリの場合、断定的な医学情報は書かず「確認いたします」「担当より改めてご連絡いたします」等の表現を使ってください

## 出力形式
以下のJSON形式で出力してください:
{
  "category": "operational" | "medical" | "greeting" | "other",
  "confidence": 0.0~1.0,
  "reply": "返信テキスト（greetingの場合のみnull）",
  "reason": "判定理由（短文）"
}`;
}

// ユーザーメッセージ構築（直近の会話コンテキスト + 未返信メッセージ）
function buildUserMessage(
  pendingMessages: string[],
  recentMessages: Array<{ direction: string; content: string }>
): string {
  let context = "";
  if (recentMessages.length > 0) {
    context = "## 直近の会話（参考: スタッフの返信トーンを真似してください）\n" + recentMessages.map(m =>
      `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content}`
    ).join("\n") + "\n\n";
  }
  const msgs = pendingMessages.length === 1
    ? pendingMessages[0]
    : pendingMessages.map((m, i) => `(${i + 1}) ${m}`).join("\n");
  return `${context}## 患者からの新しいメッセージ\n${msgs}`;
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
  if (!settings?.is_enabled) return;

  const filterResult = shouldProcessWithAI(messageText, "text", settings);
  if (!filterResult.process) {
    console.log(`[AI Reply] スキップ: ${filterResult.reason}`);
    return;
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
    await redis.set(debounceKey, JSON.stringify(entry), { ex: DEBOUNCE_SEC * 3 }); // TTL余裕を持たせる
    // デバウンスキーの一覧管理用セットにも追加
    await redis.sadd("ai_debounce_keys", patientId);
  } catch (e) {
    console.error("[AI Reply] Redis set error:", e);
    return;
  }

  console.log(`[AI Reply] デバウンス登録: ${patientId}（cronが${DEBOUNCE_SEC}秒後に処理）`);
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

      // デバウンス期間（60秒）経過していなければスキップ
      if (now - entry.ts < DEBOUNCE_SEC * 1000) continue;

      // デバウンス通過 → マーカー削除してAI処理実行
      await redis.del(debounceKey);
      await redis.srem("ai_debounce_keys", patientId);

      console.log(`[AI Reply] デバウンス通過: ${patientId}（${Math.round((now - entry.ts) / 1000)}秒経過）`);

      try {
        await processAiReply(entry.lineUid, entry.patientId, entry.patientName, entry.tenantId);
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
async function processAiReply(
  lineUid: string,
  patientId: string,
  patientName: string,
  tenantId: string | null
): Promise<void> {
  const log: string[] = [];
  lastProcessLog = log;
  const tid = tenantId ?? undefined;

  // 1. AI返信設定を取得
  log.push("step1: settings取得");
  const { data: settings } = await withTenant(
    supabaseAdmin.from("ai_reply_settings").select("*").maybeSingle(),
    tenantId
  );
  if (!settings?.is_enabled) { log.push("skip: settings無効"); return; }
  log.push("step1: OK");

  // 2. APIキーを取得
  log.push("step2: APIキー取得");
  const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
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

  // 4. 直近の会話コンテキスト取得（最新15件）
  const { data: recentMsgs } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("direction, content, event_type, sent_at")
      .eq("patient_id", patientId)
      .in("event_type", ["message", "auto_reply", "ai_reply"])
      .order("sent_at", { ascending: false })
      .limit(15),
    tenantId
  );

  const sorted = (recentMsgs || []).reverse();

  // 5. 最後のoutgoing以降の未返信incomingメッセージを収集
  let lastOutgoingIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].direction === "outgoing") {
      lastOutgoingIdx = i;
      break;
    }
  }
  const pendingMessages = sorted
    .slice(lastOutgoingIdx + 1)
    .filter(m => m.direction === "incoming")
    .map(m => m.content);

  if (pendingMessages.length === 0) {
    log.push("skip: 未返信メッセージなし");
    console.log(`[AI Reply] 未返信メッセージなし: ${patientId}`);
    return;
  }
  log.push(`step5: pending=${pendingMessages.length}件`);

  // 会話コンテキスト（最後のoutgoingまで）
  const contextMessages = lastOutgoingIdx >= 0 ? sorted.slice(0, lastOutgoingIdx + 1) : [];

  // 6. Claude API呼び出し
  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(
    settings.knowledge_base || "",
    settings.custom_instructions || ""
  );
  const userMessage = buildUserMessage(pendingMessages, contextMessages);

  let aiResult: AiReplyResult;
  let inputTokens = 0;
  let outputTokens = 0;

  log.push("step6: Claude API呼び出し");
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    log.push(`step6: レスポンス取得 (tokens: ${inputTokens}/${outputTokens})`);
    log.push(`step6: raw=${text.substring(0, 200)}`);
    // マークダウンコードブロック内のJSON or 直接JSONを抽出
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch ? codeBlockMatch : text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error("AIレスポンスにJSONが含まれていません");
    aiResult = JSON.parse(jsonMatch[1]);
    log.push(`step6: category=${aiResult.category}, confidence=${aiResult.confidence}`);
  } catch (err) {
    log.push(`error: Claude API失敗: ${err}`);
    console.error("[AI Reply] Claude API エラー:", err);
    return;
  }

  // 7. greeting/返信不要はスキップ
  if (aiResult.category === "greeting" || !aiResult.reply) {
    log.push(`skip: category=${aiResult.category}, reason=${aiResult.reason}`);
    console.log(`[AI Reply] category=${aiResult.category}, スキップ: ${aiResult.reason}`);
    return;
  }

  // 8. 返信案をDBに保存
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (settings.approval_timeout_hours || 24));
  const originalMessage = pendingMessages.join("\n");

  const { data: draft, error: insertError } = await supabaseAdmin
    .from("ai_reply_drafts")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      line_uid: lineUid,
      original_message: originalMessage,
      ai_category: aiResult.category,
      draft_reply: aiResult.reply,
      confidence: aiResult.confidence,
      status: settings.mode === "auto" ? "approved" : "pending",
      model_used: "claude-sonnet-4-5-20250929",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !draft) {
    console.error("[AI Reply] 返信案保存エラー:", insertError);
    return;
  }

  // 9. モードに応じた処理
  if (settings.mode === "auto") {
    await sendAiReply(draft.id, lineUid, aiResult.reply, patientId, tenantId);
  } else {
    // origin: Vercelではホスト名から推定
    const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://noname-beauty.l-ope.jp");
    await sendApprovalFlexMessage(
      draft.id, patientId, patientName,
      originalMessage, aiResult.reply, aiResult.confidence,
      aiResult.category, tid, origin
    );
  }
}

/** AI返信を実送信 */
export async function sendAiReply(
  draftId: number,
  lineUid: string,
  replyText: string,
  patientId: string,
  tenantId: string | null
): Promise<void> {
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
  }
}
