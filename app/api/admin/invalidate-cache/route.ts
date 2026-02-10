// app/api/admin/invalidate-cache/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patientId = body.patient_id || body.patientId || "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "patient_id required" }, { status: 400 });
    }

    // ★ Redis キャッシュ削除
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/invalidate-cache error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
