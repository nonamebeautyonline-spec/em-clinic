// AI返信 実験管理API（Phase 3-4）
// GET: 実験一覧+結果 / POST: 実験作成 / PATCH: 開始/停止 / DELETE: 削除

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { aggregateExperimentResults, generateSuggestion } from "@/lib/ai-reply-experiment";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 実験一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_experiments")
        .select("*")
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) return serverError("実験の取得に失敗しました");

    // running/completed実験の結果を付加
    const experiments = await Promise.all(
      (data || []).map(async (exp) => {
        if (exp.status === "running" || exp.status === "completed") {
          const results = await aggregateExperimentResults(exp.id, tenantId);
          const suggestion = generateSuggestion(results.control, results.variant);
          return { ...exp, results, suggestion };
        }
        return { ...exp, results: null, suggestion: null };
      })
    );

    return NextResponse.json({ experiments });
  } catch (err) {
    console.error("[Experiments API] 取得エラー:", err);
    return serverError("実験の取得に失敗しました");
  }
}

// 実験作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { experiment_name, config, traffic_ratio } = body;
    if (!experiment_name || !config) return badRequest("experiment_nameとconfigが必要です");

    const { data, error } = await supabaseAdmin
      .from("ai_reply_experiments")
      .insert({
        ...tenantPayload(tenantId),
        experiment_name,
        config,
        traffic_ratio: traffic_ratio || 0.5,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) return serverError("実験の作成に失敗しました");

    logAudit(req, "experiment.create", "ai_reply_experiments", String(data.id));
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[Experiments API] 作成エラー:", err);
    return serverError("実験の作成に失敗しました");
  }
}

// 実験の開始/停止/完了
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { id, action } = body;
    if (!id || !action) return badRequest("idとactionが必要です");

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === "start") {
      updates.status = "running";
      updates.started_at = new Date().toISOString();
    } else if (action === "stop" || action === "complete") {
      updates.status = "completed";
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_experiments")
        .update(updates)
        .eq("id", id),
      tenantId
    );

    if (error) return serverError("実験の更新に失敗しました");

    logAudit(req, `experiment.${action}`, "ai_reply_experiments", String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Experiments API] 更新エラー:", err);
    return serverError("実験の更新に失敗しました");
  }
}

// 実験削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { id } = await req.json();
    if (!id) return badRequest("IDが必要です");

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_experiments")
        .delete()
        .eq("id", id),
      tenantId
    );

    if (error) return serverError("実験の削除に失敗しました");

    logAudit(req, "experiment.delete", "ai_reply_experiments", String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Experiments API] 削除エラー:", err);
    return serverError("実験の削除に失敗しました");
  }
}
