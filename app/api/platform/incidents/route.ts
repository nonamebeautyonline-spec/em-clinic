// app/api/platform/incidents/route.ts — インシデント管理API
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: インシデント一覧取得（platform_admin限定）
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "権限がありません" },
      { status: 403 }
    );
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
    return NextResponse.json(
      { error: "インシデントの取得に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ incidents: data || [] });
}

// POST: インシデント作成（platform_admin限定）
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: "権限がありません" },
      { status: 403 }
    );
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
    return NextResponse.json(
      { error: "不正なリクエスト" },
      { status: 400 }
    );
  }

  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json(
      { error: "titleは必須です" },
      { status: 400 }
    );
  }

  // severity バリデーション
  const validSeverities = ["critical", "major", "minor"];
  if (body.severity && !validSeverities.includes(body.severity)) {
    return NextResponse.json(
      { error: `severityは ${validSeverities.join(", ")} のいずれかです` },
      { status: 400 }
    );
  }

  // status バリデーション
  const validStatuses = ["investigating", "identified", "monitoring", "resolved"];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `statusは ${validStatuses.join(", ")} のいずれかです` },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "インシデントの作成に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ incident: data }, { status: 201 });
}
