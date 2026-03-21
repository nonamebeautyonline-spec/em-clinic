// 患者向け: アクティブな診療分野一覧 + マルチ分野モード判定
import { NextRequest, NextResponse } from "next/server";
import { resolveTenantId } from "@/lib/tenant";
import { getMedicalFields, isMultiFieldEnabled, getDefaultMedicalField } from "@/lib/medical-fields";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const multiFieldEnabled = await isMultiFieldEnabled(tenantId);

  if (!multiFieldEnabled) {
    // 単一分野モード: デフォルト分野のみ返す
    const defaultField = tenantId ? await getDefaultMedicalField(tenantId) : null;
    return NextResponse.json({
      multiFieldEnabled: false,
      fields: defaultField ? [defaultField] : [],
      defaultFieldId: defaultField?.id ?? null,
    });
  }

  const fields = await getMedicalFields(tenantId);
  const defaultFieldId = fields[0]?.id ?? null;

  return NextResponse.json({
    multiFieldEnabled: true,
    fields: fields.map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      description: f.description,
      icon_url: f.icon_url,
      color_theme: f.color_theme,
    })),
    defaultFieldId,
  });
}
