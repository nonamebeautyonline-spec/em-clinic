// app/api/register/complete-redirect/route.ts
// patient_id cookie が古い場合に正しい値に再設定してマイページへリダイレクト
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { createPatientToken, patientSessionCookieOptions } from "@/lib/patient-session";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  const pid = req.nextUrl.searchParams.get("pid");
  if (!pid) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // pid が実在するか確認
  const { data: intake } = await withTenant(supabaseAdmin
    .from("intake")
    .select("patient_id")
    .eq("patient_id", pid), tenantId)
    .limit(1)
    .maybeSingle();

  if (!intake) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // JWT生成のためDBからline_idを取得
  const { data: patientRow } = await withTenant(supabaseAdmin
    .from("patients")
    .select("line_id")
    .eq("patient_id", pid), tenantId)
    .maybeSingle();
  const lineUserId = patientRow?.line_id || "";

  const res = NextResponse.redirect(new URL("/mypage", req.url));

  // JWT患者セッション Cookie
  if (lineUserId) {
    const jwt = await createPatientToken(pid, lineUserId, tenantId ?? undefined);
    res.cookies.set("patient_session", jwt, patientSessionCookieOptions());
  }
  // 旧Cookie（互換性維持）
  res.cookies.set("__Host-patient_id", pid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  res.cookies.set("patient_id", pid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  console.log(`[complete-redirect] Cookie updated to ${pid}`);
  return res;
}
