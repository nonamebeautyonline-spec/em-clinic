// app/api/admin/invalidate-cache/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateCacheSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, invalidateCacheSchema);
    if ("error" in parsed) return parsed.error;
    const patientId = parsed.data.patient_id || parsed.data.patientId || "";

    // ★ Redis キャッシュ削除
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/invalidate-cache error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
