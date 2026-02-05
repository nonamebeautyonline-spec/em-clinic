// app/api/admin/invalidate-cache/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const MYPAGE_INVALIDATE_SECRET = process.env.MYPAGE_INVALIDATE_SECRET || "";

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

    // ★ Vercel Redis キャッシュ削除
    await invalidateDashboardCache(patientId);

    // ★ GAS キャッシュ削除（確実に待つ）
    if (GAS_MYPAGE_URL) {
      try {
        const gasResponse = await fetch(GAS_MYPAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invalidate_cache",
            patient_id: patientId,
            secret: MYPAGE_INVALIDATE_SECRET,
          }),
          signal: AbortSignal.timeout(10000), // 10秒タイムアウト
        });

        if (!gasResponse.ok) {
          console.error(`[invalidate-cache] GAS returned status ${gasResponse.status}`);
        } else {
          const gasData = await gasResponse.json().catch(() => ({}));
          console.log(`[invalidate-cache] GAS cache cleared for patient ${patientId}:`, gasData);
        }
      } catch (err) {
        console.error("[invalidate-cache] GAS call failed:", err);
        // GAS失敗してもVercel Redisは削除済みなので、エラーにはしない
      }
    }

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/invalidate-cache error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
