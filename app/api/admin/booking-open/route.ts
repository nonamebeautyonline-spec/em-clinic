import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET: 指定月の開放状態を確認
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("booking_open_settings")
      .select("*")
      .eq("target_month", month)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (not an error)
      console.error("DB error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      month,
      is_open: data?.is_open ?? false,
      opened_at: data?.opened_at ?? null,
    });
  } catch (e: any) {
    console.error("API error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST: 指定月の予約を早期開放
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { month, memo } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
    }

    // upsert: 既存レコードがあれば更新、なければ挿入
    const { data, error } = await supabaseAdmin
      .from("booking_open_settings")
      .upsert(
        {
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
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[Booking Open] Month ${month} has been opened early`);

    return NextResponse.json({
      ok: true,
      message: `${month}の予約を開放しました`,
      data,
    });
  } catch (e: any) {
    console.error("API error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE: 早期開放を取り消し（通常の5日開放に戻す）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("booking_open_settings")
      .delete()
      .eq("target_month", month);

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[Booking Open] Early open for ${month} has been cancelled`);

    return NextResponse.json({
      ok: true,
      message: `${month}の早期開放を取り消しました`,
    });
  } catch (e: any) {
    console.error("API error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
