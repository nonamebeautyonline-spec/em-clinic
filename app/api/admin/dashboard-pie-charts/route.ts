import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { jwtVerify } from "jose";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return true;
    } catch { /* 次の方式を試す */ }
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    if (authHeader.substring(7) === process.env.ADMIN_TOKEN) return true;
  }
  return false;
}

/** 日付範囲を計算（JST基準） */
function calculateDateRange(range: string, customStart?: string | null, customEnd?: string | null): { start: string; end: string } | null {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const jstYear = jst.getUTCFullYear();
  const jstMonth = jst.getUTCMonth();
  const jstDate = jst.getUTCDate();
  const jstDay = jst.getUTCDay();

  switch (range) {
    case "today": {
      const d = new Date(Date.UTC(jstYear, jstMonth, jstDate));
      return { start: fmt(d) + "T00:00:00+09:00", end: fmt(new Date(d.getTime() + 86400000)) + "T00:00:00+09:00" };
    }
    case "yesterday": {
      const d = new Date(Date.UTC(jstYear, jstMonth, jstDate - 1));
      return { start: fmt(d) + "T00:00:00+09:00", end: fmt(new Date(d.getTime() + 86400000)) + "T00:00:00+09:00" };
    }
    case "this_week": {
      const mondayOffset = jstDay === 0 ? -6 : 1 - jstDay;
      const monday = new Date(Date.UTC(jstYear, jstMonth, jstDate + mondayOffset));
      const nextMonday = new Date(monday.getTime() + 7 * 86400000);
      return { start: fmt(monday) + "T00:00:00+09:00", end: fmt(nextMonday) + "T00:00:00+09:00" };
    }
    case "last_week": {
      const mondayOffset = jstDay === 0 ? -6 : 1 - jstDay;
      const thisMonday = new Date(Date.UTC(jstYear, jstMonth, jstDate + mondayOffset));
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
      return { start: fmt(lastMonday) + "T00:00:00+09:00", end: fmt(thisMonday) + "T00:00:00+09:00" };
    }
    case "this_month": {
      const start = new Date(Date.UTC(jstYear, jstMonth, 1));
      const end = new Date(Date.UTC(jstYear, jstMonth + 1, 1));
      return { start: fmt(start) + "T00:00:00+09:00", end: fmt(end) + "T00:00:00+09:00" };
    }
    case "last_month": {
      const start = new Date(Date.UTC(jstYear, jstMonth - 1, 1));
      const end = new Date(Date.UTC(jstYear, jstMonth, 1));
      return { start: fmt(start) + "T00:00:00+09:00", end: fmt(end) + "T00:00:00+09:00" };
    }
    case "custom": {
      if (customStart && customEnd) {
        return { start: customStart + "T00:00:00+09:00", end: customEnd + "T23:59:59+09:00" };
      }
      return null;
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminAuth(request))) return unauthorized();
    const tenantId = resolveTenantIdOrThrow(request);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "this_month";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");

    const dateRange = calculateDateRange(range, customStart, customEnd);

    const rpcParams: Record<string, unknown> = { p_tenant_id: tenantId };
    if (dateRange) {
      rpcParams.p_range_start = dateRange.start;
      rpcParams.p_range_end = dateRange.end;
    }

    const { data, error } = await supabaseAdmin.rpc("dashboard_pie_charts", rpcParams);

    if (error) {
      console.error("[dashboard-pie-charts] RPC error:", error);
      return serverError(error.message);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[dashboard-pie-charts] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
