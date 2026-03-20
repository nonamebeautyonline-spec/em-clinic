import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { bookingOpenSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: 指定月の開放状態を確認
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return badRequest("Invalid month format. Use YYYY-MM");
  }

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("booking_open_settings")
        .select("*")
        .eq("target_month", month),
      tenantId
    ).single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (not an error)
      console.error("DB error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({
      ok: true,
      month,
      is_open: data?.is_open ?? false,
      opened_at: data?.opened_at ?? null,
    });
  } catch (e) {
    console.error("API error:", e);
    return serverError((e as Error).message);
  }
}

// POST: 指定月の予約を早期開放
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, bookingOpenSchema);
    if ("error" in parsed) return parsed.error;
    const { month, memo } = parsed.data;

    // upsert: 既存レコードがあれば更新、なければ挿入
    const { data, error } = await supabaseAdmin
      .from("booking_open_settings")
      .upsert(
        {
          ...tenantPayload(tenantId),
          target_month: month,
          is_open: true,
          opened_at: new Date().toISOString(),
          memo: memo || null,
        },
        { onConflict: "target_month" }
      )
      .select()
      .single();

    if (error) {
      console.error("DB error:", error);
      return serverError(error.message);
    }

    console.log(`[Booking Open] Month ${month} has been opened early`);

    logAudit(req, "booking.create", "booking", "unknown");
    return NextResponse.json({
      ok: true,
      message: `${month}の予約を開放しました`,
      data,
    });
  } catch (e) {
    console.error("API error:", e);
    return serverError((e as Error).message);
  }
}

// DELETE: 早期開放を取り消し（通常の5日開放に戻す）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return badRequest("Invalid month format. Use YYYY-MM");
  }

  try {
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("booking_open_settings")
        .delete()
        .eq("target_month", month),
      tenantId
    );

    if (error) {
      console.error("DB error:", error);
      return serverError(error.message);
    }

    console.log(`[Booking Open] Early open for ${month} has been cancelled`);

    logAudit(req, "booking.delete", "booking", "unknown");
    return NextResponse.json({
      ok: true,
      message: `${month}の早期開放を取り消しました`,
    });
  } catch (e) {
    console.error("API error:", e);
    return serverError((e as Error).message);
  }
}
