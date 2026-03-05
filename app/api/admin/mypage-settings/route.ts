// マイページ設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getMypageConfig, setMypageConfig } from "@/lib/mypage/config";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { mypageSettingsSchema } from "@/lib/validations/admin-operations";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantId(req);
  const config = await getMypageConfig(tenantId ?? undefined);
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, mypageSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const { config } = parsed.data;

  const saved = await setMypageConfig(config, tenantId ?? undefined);
  if (!saved) return serverError("保存に失敗しました");
  return NextResponse.json({ ok: true });
}
