// AI返信ドラフト取得API（管理画面トーク画面用）
// GET: patient_id で pending ドラフトを取得
// POST: ドラフトの送信・却下・再生成

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import Anthropic from "@anthropic-ai/sdk";
import { sendAiReply, buildSystemPrompt, buildUserMessage, fetchPatientFlowStatus, type RejectedDraftEntry } from "@/lib/ai-reply";
import { saveAiReplyExample, boostExampleQuality, penalizeExampleQuality, executeRAGPipeline } from "@/lib/embedding";
import { getSettingOrEnv } from "@/lib/settings";
import { parseBody } from "@/lib/validations/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET: 患者IDのpendingドラフトを取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return badRequest("patient_id が必要です");

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("id, patient_id, line_uid, original_message, draft_reply, status, ai_category, confidence, model_used, created_at, expires_at")
      .eq("patient_id", patientId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId
  );

  if (error) return serverError(error.message);
  if (!data) return NextResponse.json({ draft: null });

  return NextResponse.json({ draft: data });
}

// POST: ドラフトに対するアクション（send / reject / regenerate / batch_approve / batch_reject）
const actionSchema = z.object({
  draft_id: z.number().optional(),
  draft_ids: z.array(z.number()).optional(),
  action: z.enum(["send", "reject", "regenerate", "batch_approve", "batch_reject"]),
  modified_reply: z.string().optional(),
  reject_reason: z.string().optional(),
  reject_category: z.string().optional(),
  instruction: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, actionSchema);
  if ("error" in parsed) return parsed.error;
  const { draft_id, action, modified_reply, reject_reason, reject_category, instruction } = parsed.data;

  // 一括操作は別途ハンドリング（draft_id不要、関数末尾で処理）
  if (action === "batch_approve" || action === "batch_reject") {
    // 下のbatch処理ブロックに到達させる（単一操作をスキップ）
    // eslint-disable-next-line no-empty
  } else {
    if (!draft_id) return badRequest("draft_idが必要です");
  }

  // 単一操作用ドラフト取得（batch操作時はスキップ）
  let draft: Record<string, unknown> | null = null;
  if (draft_id && action !== "batch_approve" && action !== "batch_reject") {
    const { data, error } = await withTenant(
      supabaseAdmin
        .from("ai_reply_drafts")
        .select("*")
        .eq("id", draft_id)
        .single(),
      tenantId
    );
    if (error || !data) return badRequest("ドラフトが見つかりません");
    if (data.status !== "pending") return badRequest("このドラフトは既に処理済みです");
    draft = data;
  }

  // 送信
  if (action === "send" && draft) {
    const id = draft_id!;
    const replyText = modified_reply || (draft.draft_reply as string);

    // modified_reply を記録
    if (modified_reply && modified_reply !== draft.draft_reply) {
      await supabaseAdmin
        .from("ai_reply_drafts")
        .update({ modified_reply })
        .eq("id", id);
    }

    await sendAiReply(id, draft.line_uid as string, replyText, draft.patient_id as string, draft.tenant_id as string);

    // 学習例として保存 + 品質スコア向上
    try {
      await saveAiReplyExample({
        tenantId: draft.tenant_id as string,
        question: draft.original_message as string,
        answer: replyText,
        source: modified_reply ? "staff_edit" : "staff_edit",
        draftId: draft.id as number,
      });
      await boostExampleQuality(draft.id as number);
    } catch (err) {
      console.error("[AI Reply Admin] 学習例保存エラー:", err);
    }

    return NextResponse.json({ ok: true, action: "sent" });
  }

  // 却下
  if (action === "reject" && draft) {
    const id = draft_id!;
    const rejCat = reject_category || "other";
    await supabaseAdmin
      .from("ai_reply_drafts")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        reject_reason: reject_reason || "管理画面から却下",
        reject_category: rejCat,
      })
      .eq("id", id);

    penalizeExampleQuality(id, rejCat).catch(() => {});
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // 再生成
  if (action === "regenerate" && draft) {
    const id = draft_id!;
    if (!instruction) return badRequest("修正指示が必要です");

    const tid = (draft.tenant_id as string | null) ?? undefined;
    const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tid)) || "";
    if (!apiKey) return serverError("APIキー未設定");

    const { data: settings } = await withTenant(
      supabaseAdmin.from("ai_reply_settings").select("knowledge_base, custom_instructions, medical_reply_mode, model_id, greeting_reply_enabled").maybeSingle(),
      draft.tenant_id as string | null
    );
    const modelId = settings?.model_id || "claude-sonnet-4-6";

    // 過去の修正指示をDBから取得（永続化済み）
    const pastInstructions: string[] = Array.isArray(draft.past_instructions) ? draft.past_instructions as string[] : [];
    const allInstructions = [...pastInstructions, instruction];
    const origMessage = draft.original_message as string;
    const draftReply = draft.draft_reply as string;
    const draftTenantId = draft.tenant_id as string | null;

    // 患者ステータスと会話履歴を取得（webhook側と同等のコンテキストを提供）
    const patientId = draft.patient_id as string;
    const [{ data: recentMsgs }, patientStatus] = await Promise.all([
      withTenant(
        supabaseAdmin
          .from("message_log")
          .select("direction, content, event_type, sent_at")
          .eq("patient_id", patientId)
          .in("event_type", ["message", "auto_reply", "ai_reply"])
          .order("sent_at", { ascending: false })
          .limit(15),
        draftTenantId
      ),
      fetchPatientFlowStatus(patientId, draftTenantId),
    ]);
    const sorted = (recentMsgs || []).reverse();
    // 最後のoutgoing以降を除いた会話コンテキスト
    let lastOutgoingIdx = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].direction === "outgoing") { lastOutgoingIdx = i; break; }
    }
    const contextMessages = lastOutgoingIdx >= 0 ? sorted.slice(0, lastOutgoingIdx + 1) : [];

    // RAGパイプライン（会話コンテキスト付き）
    const ragResult = await executeRAGPipeline({
      pendingMessages: [origMessage],
      contextMessages,
      tenantId: draftTenantId,
      knowledgeBase: settings?.knowledge_base || "",
    });

    // 却下パターン
    const { data: rejectedDrafts } = await withTenant(
      supabaseAdmin.from("ai_reply_drafts")
        .select("original_message, draft_reply, reject_category, reject_reason")
        .eq("status", "rejected")
        .order("rejected_at", { ascending: false })
        .limit(10),
      draftTenantId
    );

    const client = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(
      settings?.knowledge_base || "",
      settings?.custom_instructions || "",
      (rejectedDrafts as RejectedDraftEntry[] | null) ?? undefined,
      ragResult.examples,
      settings?.medical_reply_mode || "confirm",
      !!settings?.greeting_reply_enabled,
      ragResult.knowledgeChunks
    );

    // 患者コンテキストをbuildUserMessageで構築
    const patientContext = buildUserMessage([origMessage], contextMessages, patientStatus);

    // 過去の指示を全て含めたプロンプト
    const pastSection = pastInstructions.length > 0
      ? `\n\n## 過去の修正指示\n${pastInstructions.map((inst, i) => `${i + 1}. ${inst}`).join("\n")}\n`
      : "";

    const userMessage = `以下のAI返信案をスタッフの修正指示に従って改善してください。

${patientContext}

## 現在のAI返信案
${draftReply}${pastSection}

## 最新の修正指示
${instruction}

修正後の返信テキストのみを出力してください。JSON形式は不要です。`;

    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const newReply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      if (!newReply) return serverError("AIからの返信が空です");

      // ドラフト更新（修正指示履歴もDBに永続化）
      await supabaseAdmin
        .from("ai_reply_drafts")
        .update({ draft_reply: newReply, past_instructions: allInstructions })
        .eq("id", id);

      return NextResponse.json({ ok: true, action: "regenerated", newReply });
    } catch (err) {
      console.error("[AI Reply Admin] 再生成エラー:", err);
      return serverError("AI再生成に失敗しました");
    }
  }

  // 一括承認
  if (action === "batch_approve" && parsed.data.draft_ids?.length) {
    const ids = parsed.data.draft_ids;
    let sentCount = 0;
    for (const id of ids) {
      const { data: d } = await withTenant(
        supabaseAdmin.from("ai_reply_drafts").select("*").eq("id", id).eq("status", "pending").single(),
        tenantId
      );
      if (!d) continue;
      await sendAiReply(d.id, d.line_uid, d.draft_reply, d.patient_id, d.tenant_id);
      saveAiReplyExample({
        tenantId: d.tenant_id, question: d.original_message,
        answer: d.draft_reply, source: "staff_edit", draftId: d.id,
      }).catch(() => {});
      boostExampleQuality(d.id).catch(() => {});
      sentCount++;
    }
    return NextResponse.json({ ok: true, action: "batch_approved", sentCount });
  }

  // 一括却下
  if (action === "batch_reject" && parsed.data.draft_ids?.length) {
    const ids = parsed.data.draft_ids;
    const batchRejCat = reject_category || "other";
    await supabaseAdmin
      .from("ai_reply_drafts")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        reject_reason: parsed.data.reject_reason || "一括却下",
        reject_category: batchRejCat,
      })
      .in("id", ids)
      .eq("status", "pending");

    for (const id of ids) {
      penalizeExampleQuality(id, batchRejCat).catch(() => {});
    }
    return NextResponse.json({ ok: true, action: "batch_rejected", rejectedCount: ids.length });
  }

  return badRequest("無効なアクション");
}
