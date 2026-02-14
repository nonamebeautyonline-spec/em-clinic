// app/api/admin/line/segments/route.ts — セグメント保存・管理
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting } from "@/lib/settings";

export interface SavedSegment {
  id: string;
  name: string;
  includeConditions: Record<string, unknown>[];
  excludeConditions: Record<string, unknown>[];
  created_at: string;
}

async function loadSegments(): Promise<SavedSegment[]> {
  const raw = await getSetting("line", "saved_segments");
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveSegments(segments: SavedSegment[]): Promise<boolean> {
  return setSetting("line", "saved_segments", JSON.stringify(segments));
}

// セグメント一覧取得
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const segments = await loadSegments();
  return NextResponse.json({ segments });
}

// セグメント作成
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, includeConditions, excludeConditions } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "セグメント名は必須です" }, { status: 400 });
  }

  const segments = await loadSegments();
  const newSeg: SavedSegment = {
    id: crypto.randomUUID(),
    name: name.trim(),
    includeConditions: includeConditions || [],
    excludeConditions: excludeConditions || [],
    created_at: new Date().toISOString(),
  };
  segments.unshift(newSeg);

  const saved = await saveSegments(segments);
  if (!saved) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ segment: newSeg });
}

// セグメント削除
export async function DELETE(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "idは必須です" }, { status: 400 });

  const segments = await loadSegments();
  const filtered = segments.filter(s => s.id !== id);
  if (filtered.length === segments.length) {
    return NextResponse.json({ error: "セグメントが見つかりません" }, { status: 404 });
  }

  const saved = await saveSegments(filtered);
  if (!saved) return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
