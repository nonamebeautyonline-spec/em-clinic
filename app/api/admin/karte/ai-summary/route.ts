// AIカルテ要約API — 問診+過去カルテ+処方履歴からSOAP形式の要約を自動生成
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { generateAiKarteSummary } from "@/lib/ai-karte-summary";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // テナント解決
    const tenantId = resolveTenantId(req);

    // リクエストボディ
    const body = await req.json();
    const { patient_id, intake_id } = body as {
      patient_id?: string;
      intake_id?: number;
    };

    if (!patient_id || typeof patient_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "patient_id は必須です" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
