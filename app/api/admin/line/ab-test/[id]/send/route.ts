// app/api/admin/line/ab-test/[id]/send/route.ts — ABテスト配信実行API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage, type LineMessage } from "@/lib/line-push";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST: ABテスト配信実行
 *
 * 1. 対象者リスト取得（全LINE友だち or セグメントフィルタ）
 * 2. allocation_ratioに基づいてランダム振り分け
 * 3. 各バリアントのメッセージをLINE送信
 * 4. ab_test_assignmentsにINSERT
 * 5. ab_test_variants.sent_count更新
 * 6. ab_tests.statusを"running"に更新
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id: testId } = await ctx.params;

  // テストの存在・ステータス確認
  const { data: test } = await strictWithTenant(
    supabaseAdmin.from("ab_tests").select("*").eq("id", testId),
    tenantId,
  ).single();

  if (!test) return notFound("ABテストが見つかりません");
  if (test.status !== "draft") {
    return badRequest("下書き状態のテストのみ配信できます");
  }

  // バリアント取得
  const { data: variants } = await supabaseAdmin
    .from("ab_test_variants")
    .select("*")
    .eq("ab_test_id", testId)
    .order("created_at", { ascending: true });

  if (!variants || variants.length < 2) {
    return badRequest("配信にはバリアントが2つ以上必要です");
  }

  // 配分比率合計チェック
  const totalRatio = variants.reduce((sum: number, v: { allocation_ratio: number }) => sum + Number(v.allocation_ratio), 0);
  if (totalRatio !== 100) {
    return badRequest(`配分比率の合計が100%ではありません（現在: ${totalRatio}%）`);
  }

  // メッセージ未設定バリアントのチェック
  for (const v of variants) {
    if (!v.message_content && !v.flex_json && !v.template_id) {
      return badRequest(`バリアント「${v.name}」のメッセージが未設定です`);
    }
  }

  // 対象患者リスト取得（LINE友だちのみ）
  // .in() は5000件超でサイレント失敗するため、テナント全件取得→JSフィルタ
  const { data: allPatients, error: pErr } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("id, line_id")
      .not("line_id", "is", null)
      .limit(100000),
    tenantId,
  );

  if (pErr) return serverError(`患者リスト取得に失敗: ${pErr.message}`);

  // LINE IDがあり、有効な患者のみ
  const recipients = (allPatients || []).filter(
    (p: { id: number; line_id: string | null }) => p.line_id && p.line_id.startsWith("U"),
  );

  if (recipients.length === 0) {
    return badRequest("配信対象のLINE友だちがいません");
  }

  // ランダムシャッフル（Fisher-Yates）
  const shuffled = [...recipients];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 配分比率に基づいて振り分け
  type Assignment = {
    variant: typeof variants[0];
    patients: typeof recipients;
  };

  const assignments: Assignment[] = [];
  let cursor = 0;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const ratio = Number(v.allocation_ratio) / 100;
    // 最後のバリアントは残り全部
    const count = i === variants.length - 1
      ? shuffled.length - cursor
      : Math.round(shuffled.length * ratio);
    const slice = shuffled.slice(cursor, cursor + count);
    cursor += count;
    assignments.push({ variant: v, patients: slice });
  }

  // 配信実行 + assignment INSERT + message_log INSERT
  let totalSent = 0;
  const errors: string[] = [];

  for (const { variant, patients } of assignments) {
    // LINE送信用メッセージ構築
    const messages: LineMessage[] = [];

    if (variant.message_type === "flex" && variant.flex_json) {
      messages.push({
        type: "flex",
        altText: variant.message_content || "メッセージ",
        contents: typeof variant.flex_json === "string"
          ? JSON.parse(variant.flex_json)
          : variant.flex_json,
      });
    } else {
      messages.push({
        type: "text",
        text: variant.message_content || "",
      });
    }

    let variantSentCount = 0;

    // 患者ごとにPush送信
    for (const patient of patients) {
      try {
        const res = await pushMessage(patient.line_id!, messages, tenantId);
        const sentOk = res && res.ok;

        // ab_test_assignmentsにINSERT
        await supabaseAdmin.from("ab_test_assignments").insert({
          test_id: testId,
          variant_id: variant.id,
          patient_id: patient.id,
          sent_at: sentOk ? new Date().toISOString() : null,
        });

        // message_logにINSERT（必須ルール）
        if (sentOk) {
          await supabaseAdmin.from("message_log").insert({
            patient_id: patient.id,
            line_uid: patient.line_id,
            message_type: variant.message_type || "text",
            content: variant.message_content || JSON.stringify(variant.flex_json) || "",
            status: "sent",
            direction: "outgoing",
            ...tenantPayload(tenantId),
          });
          variantSentCount++;
        }
      } catch (err) {
        errors.push(`患者ID ${patient.id}: ${err instanceof Error ? err.message : "送信失敗"}`);
      }
    }

    // バリアントの送信数を更新
    await supabaseAdmin
      .from("ab_test_variants")
      .update({ sent_count: variantSentCount })
      .eq("id", variant.id);

    totalSent += variantSentCount;
  }

  // テストのステータスと配信数を更新
  await supabaseAdmin
    .from("ab_tests")
    .update({
      status: "running",
      target_count: totalSent,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", testId);

  logAudit(req, "ab_test.send", "ab_test", String(testId));

  return NextResponse.json({
    ok: true,
    total_recipients: recipients.length,
    total_sent: totalSent,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // 最大10件
    variants: assignments.map((a) => ({
      id: a.variant.id,
      name: a.variant.name,
      assigned: a.patients.length,
    })),
  });
}
