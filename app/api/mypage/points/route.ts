// app/api/mypage/points/route.ts — 患者マイページ向けポイントAPI
// GET: 自分のポイント残高+履歴

import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/api-error";
import { cookies } from "next/headers";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getBalance, getHistory } from "@/lib/points";

/**
 * GET: 自分のポイント残高と履歴を取得
 * クエリパラメータ: limit, offset
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized: patient_id cookie not found" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;

    const [balance, history] = await Promise.all([
      getBalance(tenantId, patientId),
      getHistory(tenantId, patientId, limit, offset),
    ]);

    return NextResponse.json({
      ok: true,
      balance,
      history,
    });
  } catch (err) {
    console.error("[mypage/points] GET error:", err);
    return serverError("ポイント情報の取得に失敗しました");
  }
}
