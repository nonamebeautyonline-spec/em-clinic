// app/api/platform/incidents/route.ts — インシデント管理API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: インシデント一覧取得（platform_admin限定）
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return forbidden("権限がありません");
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("incidents")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return serverError("インシデントの取得に失敗しました");
  }

  return NextResponse.json({ incidents: data || [] });
}

// POST: インシデント作成（platform_admin限定）
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return forbidden("権限がありません");
  }

  let body: {
    title: string;
    description?: string;
    severity?: string;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return badRequest("不正なリクエスト");
  }

  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return badRequest("titleは必須です");
  }

  // severity バリデーション
  const validSeverities = ["critical", "major", "minor"];
  if (body.severity && !validSeverities.includes(body.severity)) {
    return badRequest(`severityは ${validSeverities.join(", ")} のいずれかです`);
  }

  // status バリデーション
  const validStatuses = ["investigating", "identified", "monitoring", "resolved"];
  if (body.status && !validStatuses.includes(body.status)) {
    return badRequest(`statusは ${validStatuses.join(", ")} のいずれかです`);
  }

  const { data, error } = await supabaseAdmin
    .from("incidents")
    .insert({
      title: body.title.trim(),
      description: body.description || null,
      severity: body.severity || "minor",
      status: body.status || "investigating",
    })
    .select()
    .single();

  if (error) {
    return serverError("インシデントの作成に失敗しました");
  }

  return NextResponse.json({ incident: data }, { status: 201 });
}
