// FLEX通知設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getFlexConfig, setFlexConfig } from "@/lib/flex-message/config";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { flexSettingsSchema } from "@/lib/validations/admin-operations";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const config = await getFlexConfig(tenantId ?? undefined);
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, flexSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const { config } = parsed.data;

  const saved = await setFlexConfig(config, tenantId ?? undefined);
  if (!saved) return serverError("保存に失敗しました");
  return NextResponse.json({ ok: true });
}
