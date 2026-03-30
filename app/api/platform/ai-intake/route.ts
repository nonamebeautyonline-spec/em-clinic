// 統一Intakeエンドポイント
// チャネル別の入力を受け取り、正規化→workflow実行→ケースリンク

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { normalizeIntake, type ChannelType } from "@/lib/ai-intake-normalizer";
import { getDefaultWorkflow } from "@/lib/ai-channel-mapper";
import { findExistingCase, createCase, linkTaskToCase } from "@/lib/ai-case-linking";
import { getWorkflowOrThrow, runWorkflow } from "@/lib/ai-workflows";

const intakeBodySchema = z.object({
  channel_type: z.enum(["line", "email", "form", "slack", "phone"]),
  raw_input: z.record(z.string(), z.unknown()),
  tenant_id: z.string().optional(),
  patient_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // プラットフォーム管理者認証
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const parsed = intakeBodySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("入力パラメータが不正です");
    }

    const { channel_type, raw_input, tenant_id, patient_id } = parsed.data;
    const effectiveTenantId = tenant_id ?? admin.tenantId;

    if (!effectiveTenantId) {
      return badRequest("tenant_id が必要です");
    }

    // 1. 正規化
    let normalized;
    try {
      normalized = normalizeIntake(channel_type as ChannelType, raw_input);
    } catch (err) {
      return badRequest(`入力の正規化に失敗: ${err instanceof Error ? err.message : "不明なエラー"}`);
    }

    // patient_id が明示指定されている場合は上書き
    if (patient_id) {
      normalized.patientId = patient_id;
    }

    // 2. workflow 決定・取得
    const workflowType = getDefaultWorkflow(channel_type as ChannelType);
    const workflow = getWorkflowOrThrow(workflowType);

    // 3. workflow 用入力を構築（チャネルごとに異なる）
    const workflowInput = buildWorkflowInput(channel_type as ChannelType, raw_input, normalized);

    // 4. workflow 実行
    const { taskRun, taskId } = await runWorkflow(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workflow as any,
      workflowInput,
      effectiveTenantId,
      {
        subjectId: normalized.patientId,
        subjectType: "patient",
      }
    );

    // 5. ケース管理（タスクが正常に作成された場合のみ）
    let caseId: string | null = null;
    if (taskId) {
      try {
        // 既存ケースを検索
        const existing = await findExistingCase(effectiveTenantId, {
          patientId: normalized.patientId,
          email: normalized.senderEmail,
          phone: normalized.senderPhone,
        });

        if (existing) {
          caseId = existing.caseId;
        } else {
          // 新規ケース作成
          caseId = await createCase(
            effectiveTenantId,
            normalized.patientId ?? null,
            normalized.text.slice(0, 200)
          );
        }

        // タスクをケースにリンク
        await linkTaskToCase(caseId, taskId, channel_type as ChannelType);
      } catch (err) {
        // ケースリンクの失敗はワークフロー自体の成否に影響しない
        console.error("[ai-intake] ケースリンクエラー:", err);
      }
    }

    // 監査ログ
    logAudit(
      request,
      "ai_intake_process",
      "ai_task",
      taskId ?? "unknown",
      {
        channel_type,
        workflow_type: workflowType,
        case_id: caseId,
        status: taskRun.status,
      }
    );

    return NextResponse.json({
      ok: true,
      task_id: taskId,
      case_id: caseId,
      status: taskRun.status,
      workflow_type: workflowType,
      channel_type,
    });
  } catch (err) {
    console.error("[ai-intake] エラー:", err);
    return serverError();
  }
}

/**
 * チャネル種別に応じてworkflow用の入力オブジェクトを構築
 */
function buildWorkflowInput(
  channelType: ChannelType,
  rawInput: Record<string, unknown>,
  normalized: { text: string; senderName?: string; senderEmail?: string }
): Record<string, unknown> {
  switch (channelType) {
    case "email":
      return {
        subject: rawInput.subject ?? "",
        body: rawInput.body ?? "",
        from: rawInput.from ?? "",
        fromName: rawInput.fromName,
        to: rawInput.to ?? "",
        receivedAt: rawInput.receivedAt ?? new Date().toISOString(),
      };

    case "form":
      return {
        formId: rawInput.formId ?? "",
        fields: (rawInput.fields ?? {}) as Record<string, string>,
        submitterEmail: rawInput.submitterEmail ?? normalized.senderEmail,
        submitterName: rawInput.submitterName ?? normalized.senderName,
      };

    case "slack":
    case "phone":
    case "line":
    default:
      // support-intake 互換の入力形式
      return {
        text: normalized.text,
        senderName: normalized.senderName,
        senderEmail: normalized.senderEmail,
        senderType: "unknown",
      };
  }
}
