// 管理画面: マルチ分野モード設定 API
import { NextResponse, NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSetting, setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import type { MedicalFieldConfig } from "@/lib/medical-fields";

const DEFAULT_CONFIG: MedicalFieldConfig = {
  multiFieldEnabled: false,
};

/** GET: マルチ分野設定を取得 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const raw = await getSetting("medical_fields", "config", tenantId);
    const config: MedicalFieldConfig = raw
      ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
      : { ...DEFAULT_CONFIG };
    return NextResponse.json({ ok: true, config });
  } catch {
    return NextResponse.json({ ok: true, config: { ...DEFAULT_CONFIG } });
  }
}

/** PUT: マルチ分野設定を更新 */
export async function PUT(req: NextRequest) {
  if (!(await verifyAdminAuth(req))) return unauthorized();
  const tenantId = resolveTenantIdOrThrow(req);

  const body = await req.json();
  if (typeof body.multiFieldEnabled !== "boolean") {
    return badRequest("multiFieldEnabled (boolean) は必須です");
  }

  const config: MedicalFieldConfig = {
    multiFieldEnabled: body.multiFieldEnabled,
  };

  const success = await setSetting("medical_fields", "config", JSON.stringify(config), tenantId);
  if (!success) return serverError("設定の保存に失敗しました");

  logAudit(req, "medical_fields.config.update", "tenant_settings", `medical_fields:config`);
  return NextResponse.json({ ok: true, config });
}
