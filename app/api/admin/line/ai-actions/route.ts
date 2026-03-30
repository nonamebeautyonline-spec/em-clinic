// app/api/admin/line/ai-actions/route.ts — Safe Actions 承認/却下API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { approveAndExecuteAction, rejectAction } from "@/lib/ai-safe-actions";

// GET: ドラフトに紐づくproposed actionsを取得
export async function GET(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const url = new URL(req.url);
  const draftId = url.searchParams.get("draft_id");
  if (!draftId) return serverError("draft_id は必須です");

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("ai_proposed_actions")
      .select("*")
      .eq("draft_id", parseInt(draftId))
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ actions: data || [] });
}

// POST: アクション承認/却下
export async function POST(req: NextRequest) {
  const auth = verifyAdminAuth(req);
  if (!auth) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json();
  const { action_id, decision } = body;

  if (!action_id || !decision) {
    return serverError("action_id と decision は必須です");
  }
  if (decision !== "approve" && decision !== "reject") {
    return serverError("decision は 'approve' または 'reject' のみ");
  }

  try {
    if (decision === "approve") {
      const result = await approveAndExecuteAction(action_id, auth.name || "admin", tenantId);
      return NextResponse.json({ ok: true, result });
    } else {
      await rejectAction(action_id);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("[ai-actions] エラー:", e);
    return serverError("アクション処理に失敗しました");
  }
}
