// app/api/admin/line/rich-menus/ai-generate/route.ts
// リッチメニュー画像のAI自動生成API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { aiRichMenuGenerateSchema } from "@/lib/validations/line-common";
import { generateRichMenuImage } from "@/lib/ai-richmenu-generator";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, aiRichMenuGenerateSchema);
  if ("error" in parsed) return parsed.error;

  const { prompt, sizeType, buttonCount, buttonLabels, style, layoutCells } = parsed.data as {
    prompt: string;
    sizeType: "full" | "half";
    buttonCount: number;
    buttonLabels?: string[];
    style?: "card" | "gradient" | "banner";
    layoutCells?: { x: number; y: number; w: number; h: number }[];
  };

  try {
    const result = await generateRichMenuImage(
      { prompt, sizeType, buttonCount, buttonLabels, style, layoutCells },
      tenantId ?? undefined
    );

    return NextResponse.json({
      ok: true,
      svg: result.svg,
      buttonLabels: result.buttonLabels,
    });
  } catch (e) {
    console.error("[ai-generate] Error:", e);
    return serverError(e instanceof Error ? e.message : "生成に失敗しました");
  }
}
