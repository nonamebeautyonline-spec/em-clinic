// app/api/admin/chatbot/scenarios/[id]/nodes/route.ts — ノード CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

// ノード一覧取得
export async function GET(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id: scenarioId } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_nodes")
      .select("*")
      .eq("scenario_id", scenarioId)
      .order("position_y", { ascending: true })
      .order("position_x", { ascending: true }),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ nodes: data || [] });
}

// ノード作成
export async function POST(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id: scenarioId } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const nodeType = body.node_type as string;
  if (!nodeType || !["message", "question", "action", "condition"].includes(nodeType)) {
    return badRequest("node_type は message/question/action/condition のいずれかです");
  }

  const { data, error } = await supabaseAdmin
    .from("chatbot_nodes")
    .insert({
      ...tenantPayload(tenantId),
      scenario_id: scenarioId,
      node_type: nodeType,
      position_x: (body.position_x as number) || 0,
      position_y: (body.position_y as number) || 0,
      data: (body.data as Record<string, unknown>) || {},
      next_node_id: (body.next_node_id as string) || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, node: data });
}

// ノード更新
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id: scenarioId } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const nodeId = body.id as string;
  if (!nodeId) return badRequest("ノードIDは必須です");

  const update: Record<string, unknown> = {};
  if (body.node_type !== undefined) update.node_type = body.node_type;
  if (body.position_x !== undefined) update.position_x = body.position_x;
  if (body.position_y !== undefined) update.position_y = body.position_y;
  if (body.data !== undefined) update.data = body.data;
  if (body.next_node_id !== undefined) update.next_node_id = body.next_node_id || null;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_nodes")
      .update(update)
      .eq("id", nodeId)
      .eq("scenario_id", scenarioId),
    tenantId,
  ).select().single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, node: data });
}

// ノード削除
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id: scenarioId } = await ctx.params;
  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get("node_id");
  if (!nodeId) return badRequest("node_id は必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("chatbot_nodes")
      .delete()
      .eq("id", nodeId)
      .eq("scenario_id", scenarioId),
    tenantId,
  );

  if (error) return serverError(error.message);
  logAudit(req, "chatbot_scenario.delete", "chatbot_scenario", String(nodeId));
  return NextResponse.json({ ok: true });
}
