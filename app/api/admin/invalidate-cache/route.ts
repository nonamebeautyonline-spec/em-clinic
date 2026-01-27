// app/api/admin/invalidate-cache/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const MYPAGE_INVALIDATE_SECRET = process.env.MYPAGE_INVALIDATE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // ★ ADMIN_TOKEN チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patientId = body.patient_id || body.patientId || "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "patient_id required" }, { status: 400 });
    }

    // ★ Vercel Redis キャッシュ削除
    await invalidateDashboardCache(patientId);

    // ★ GAS キャッシュ削除（非同期、エラーは無視）
    if (GAS_MYPAGE_URL) {
      fetch(GAS_MYPAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invalidate_cache",
          patient_id: patientId,
          secret: MYPAGE_INVALIDATE_SECRET,
        }),
      }).catch((err) => {
        console.error("[invalidate-cache] GAS call failed:", err);
      });
    }

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("POST /api/admin/invalidate-cache error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
