// AIカルテ要約API — 問診+過去カルテ+処方履歴からSOAP形式の要約を自動生成
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { generateAiKarteSummary } from "@/lib/ai-karte-summary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    // テナント解決
    const tenantId = resolveTenantIdOrThrow(req);

    // リクエストボディ
    const body = await req.json();
    const { patient_id, intake_id } = body as {
      patient_id?: string;
      intake_id?: number;
    };

    if (!patient_id || typeof patient_id !== "string") {
      return badRequest("patient_id は必須です");
    }

    // AI要約生成
    const result = await generateAiKarteSummary(
      patient_id,
      tenantId,
      intake_id || undefined
    );

    return NextResponse.json({
      ok: true,
      soap: result.soap,
      summary: result.summary,
      medications: result.medications,
    });
  } catch (err) {
    console.error("[ai-summary] エラー:", err);
    const message = err instanceof Error ? err.message : "AI要約生成中にエラーが発生しました";
    return serverError(message);
  }
}
