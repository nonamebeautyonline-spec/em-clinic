// app/api/register/complete-redirect/route.ts
// patient_id cookie が古い場合に正しい値に再設定してマイページへリダイレクト
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";

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

  const res = NextResponse.redirect(new URL("/mypage", req.url));

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
