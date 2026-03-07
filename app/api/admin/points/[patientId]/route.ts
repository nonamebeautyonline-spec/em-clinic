// app/api/admin/points/[patientId]/route.ts — 特定患者のポイントAPI
// GET: 患者のポイント残高+履歴

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getBalance, getHistory } from "@/lib/points";

type RouteContext = { params: Promise<{ patientId: string }> };

/**
 * GET: 特定患者のポイント残高と履歴を取得
 * クエリパラメータ: limit, offset
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { patientId } = await context.params;

  if (!patientId) return badRequest("patientId は必須です");

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const offset = Number(url.searchParams.get("offset")) || 0;

    const [balance, history] = await Promise.all([
      getBalance(tenantId, patientId),
      getHistory(tenantId, patientId, limit, offset),
    ]);

    return NextResponse.json({
      ok: true,
      patient_id: patientId,
      balance,
      history,
    });
  } catch (err) {
    console.error("[admin/points/patientId] GET error:", err);
    return serverError("ポイント情報の取得に失敗しました");
  }
}
