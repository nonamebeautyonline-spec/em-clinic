// app/api/admin/view-mypage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis, getDashboardCacheKey } from "@/lib/redis";

const GAS_MYPAGE_URL = process.env.GAS_MYPAGE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 管理者用：患者のマイページデータを確認
 * GET /api/admin/view-mypage?patient_id=20251200128
 * Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(req: NextRequest) {
  try {
    // ★ ADMIN_TOKEN チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // ★ patient_id を取得
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "patient_id query parameter required" },
        { status: 400 }
      );
    }

    if (!GAS_MYPAGE_URL) {
      return NextResponse.json({ ok: false, error: "server_config_error" }, { status: 500 });
    }

    // ★ キャッシュチェック
    const cacheKey = getDashboardCacheKey(patientId);
    let cachedData: any = null;

    try {
      cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`[Admin] Cache hit for patient ${patientId}`);
        return NextResponse.json(
          {
            ok: true,
            source: "cache",
            patientId,
            data: cachedData,
          },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("[Admin] Cache check failed:", error);
    }

    console.log(`[Admin] Cache miss for patient ${patientId}, fetching from GAS`);

    // ★ GAS から取得
    const dashboardUrl = `${GAS_MYPAGE_URL}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}`;

    const gasRes = await fetch(dashboardUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!gasRes.ok) {
      console.error(`[Admin] GAS error for patient ${patientId}:`, gasRes.status);
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    const gasText = await gasRes.text().catch(() => "");
    let gasJson: any;

    try {
      gasJson = JSON.parse(gasText);
    } catch {
      console.error(`[Admin] GAS JSON parse error for patient ${patientId}`);
      return NextResponse.json({ ok: false, error: "gas_invalid_json" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        source: "gas",
        patientId,
        data: gasJson,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/admin/view-mypage error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
