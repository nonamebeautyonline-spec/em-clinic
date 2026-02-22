// FLEX通知設定管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getFlexConfig, setFlexConfig } from "@/lib/flex-message/config";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { flexSettingsSchema } from "@/lib/validations/admin-operations";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const config = await getFlexConfig(tenantId ?? undefined);
  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, flexSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const { config } = parsed.data;

  const saved = await setFlexConfig(config, tenantId ?? undefined);
  if (!saved) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
