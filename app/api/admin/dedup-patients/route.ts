// app/api/admin/dedup-patients/route.ts — 患者名寄せ: 重複候補検出API + 無視API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { findDuplicateCandidates, ignoreDuplicatePair } from "@/lib/patient-dedup";
import { parseBody } from "@/lib/validations/helpers";
import { ignoreDuplicateSchema } from "@/lib/validations/dedup";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/admin/dedup-patients?min_score=70&limit=20&offset=0
 * 重複候補一覧を確度順に返す（ページネーション対応）
 */
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const minScore = Number(req.nextUrl.searchParams.get("min_score") || "70");
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || "20"), 1), 100);
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") || "0"), 0);

  try {
    const allCandidates = await findDuplicateCandidates(tenantId, minScore);
    const total = allCandidates.length;
    // ページネーション: offset〜offset+limit の範囲を返す
    const candidates = allCandidates.slice(offset, offset + limit);
    return NextResponse.json({ ok: true, candidates, total, count: candidates.length });
  } catch (err) {
    console.error("[dedup-patients] 検出エラー:", err);
    return serverError("重複候補の検出に失敗しました");
  }
}

/**
 * POST /api/admin/dedup-patients
 * 重複候補を無視リストに追加
 */
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return unauthorized();
  }

  const { data, error } = await parseBody(req, ignoreDuplicateSchema);
  if (error) return error;

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const result = await ignoreDuplicatePair(data.patient_id_a, data.patient_id_b, tenantId);
    if (!result.ok) {
      return serverError(result.error ?? "処理に失敗しました");
    }
    logAudit(req, "patient.dedup_scan", "patient", "unknown");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dedup-patients] 無視リスト追加エラー:", err);
    return serverError("無視リストへの追加に失敗しました");
  }
}
