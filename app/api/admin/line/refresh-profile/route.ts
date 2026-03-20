import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { parseBody } from "@/lib/validations/helpers";
import { refreshProfileSchema } from "@/lib/validations/line-management";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// LINE Profile APIからプロフィール取得・更新
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const LINE_ACCESS_TOKEN = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
  const parsed = await parseBody(req, refreshProfileSchema);
  if ("error" in parsed) return parsed.error;
  const { patient_id } = parsed.data;

  // patient_id から line_id を patients テーブルから取得
  const { data: patientRow } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("line_id")
      .eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  if (!patientRow?.line_id) {
    return notFound("LINE ID not found");
  }

  if (!LINE_ACCESS_TOKEN) {
    return serverError("LINE access token not configured");
  }

  // LINE Profile API
  const res = await fetch(`https://api.line.me/v2/bot/profile/${patientRow.line_id}`, {
    headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch LINE profile" }, { status: 502 });
  }

  const profile = await res.json();
  const displayName = profile.displayName || null;
  const pictureUrl = profile.pictureUrl || null;

  // DBに保存（patients テーブルに保存）
  await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .update({ line_display_name: displayName, line_picture_url: pictureUrl })
      .eq("patient_id", patient_id),
    tenantId
  );

  logAudit(req, "line_profile.refresh", "patient", String(patient_id));
  return NextResponse.json({ ok: true, displayName, pictureUrl });
}
