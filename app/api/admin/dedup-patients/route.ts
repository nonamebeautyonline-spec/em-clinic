// app/api/admin/dedup-patients/route.ts — 患者名寄せ: 重複候補検出API + 無視API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { findDuplicateCandidates, ignoreDuplicatePair } from "@/lib/patient-dedup";
import { parseBody } from "@/lib/validations/helpers";
import { ignoreDuplicateSchema } from "@/lib/validations/dedup";

/**
 * GET /api/admin/dedup-patients?min_score=70
 * 重複候補一覧を確度順に返す
 */
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "認証エラー" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const minScore = Number(req.nextUrl.searchParams.get("min_score") || "70");

  try {
    const candidates = await findDuplicateCandidates(tenantId, minScore);
    return NextResponse.json({ ok: true, candidates, count: candidates.length });
  } catch (err) {
    console.error("[dedup-patients] 検出エラー:", err);
    return NextResponse.json(
      { ok: false, error: "重複候補の検出に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/dedup-patients
 * 重複候補を無視リストに追加
 */
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "認証エラー" }, { status: 401 });
  }

  const { data, error } = await parseBody(req, ignoreDuplicateSchema);
  if (error) return error;

  const tenantId = resolveTenantId(req);

  try {
    const result = await ignoreDuplicatePair(data.patient_id_a, data.patient_id_b, tenantId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dedup-patients] 無視リスト追加エラー:", err);
    return NextResponse.json(
      { ok: false, error: "無視リストへの追加に失敗しました" },
      { status: 500 },
    );
  }
}
