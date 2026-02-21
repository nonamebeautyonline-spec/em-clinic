import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { resolveTargets } from "../route";

// フィルタ条件で対象者プレビュー
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { filter_rules } = await req.json();

  const targets = await resolveTargets(filter_rules || {}, tenantId);

  // LINE UID有無で分類
  const withUid = targets.filter(t => !!t.line_id);
  const withoutUid = targets.filter(t => !t.line_id);

  return NextResponse.json({
    total: targets.length,
    sendable: withUid.length,
    no_uid: withoutUid.length,
    patients: targets.map(t => ({
      patient_id: t.patient_id,
      patient_name: t.patient_name,
      has_line: !!t.line_id,
    })),
  });
}
