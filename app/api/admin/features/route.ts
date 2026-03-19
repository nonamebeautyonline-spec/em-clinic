// app/api/admin/features/route.ts
// ログイン中の管理者テナントの有効機能一覧を返す

import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import {
  getEnabledFeatures,
  ALL_FEATURES,
  FEATURE_LABELS,
} from "@/lib/feature-flags";

export async function GET(req: NextRequest) {
  const authed = await verifyAdminAuth(req);
  if (!authed) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const enabled = await getEnabledFeatures(tenantId);

  return NextResponse.json({
    ok: true,
    features: ALL_FEATURES.map((f) => ({
      key: f,
      label: FEATURE_LABELS[f],
      enabled: enabled.includes(f),
    })),
    enabledKeys: enabled,
  });
}
