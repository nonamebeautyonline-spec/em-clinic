// lib/require-feature.ts — API用機能チェック
import { NextResponse } from "next/server";
import { resolveTenantId } from "@/lib/tenant";
import { hasFeature, type Feature } from "@/lib/feature-flags";

/**
 * APIルートで機能が有効かチェックし、無効なら403を返す
 *
 * 使い方:
 *   const denied = await requireFeature(request, "ai_reply");
 *   if (denied) return denied;
 */
export async function requireFeature(
  request: Request,
  feature: Feature
): Promise<NextResponse | null> {
  const tenantId = resolveTenantId(request);
  const enabled = await hasFeature(tenantId, feature);

  if (!enabled) {
    return NextResponse.json(
      { error: "この機能はご利用のプランでは利用できません" },
      { status: 403 }
    );
  }

  return null;
}
