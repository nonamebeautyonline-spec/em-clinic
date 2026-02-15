import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

// GET: 月次経理データ取得
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("year_month");

    if (yearMonth) {
      // 特定月のデータを取得
      const { data, error } = await withTenant(
        supabase
          .from("monthly_financials")
          .select("*")
          .eq("year_month", yearMonth),
        tenantId
      ).maybeSingle();

      if (error) {
        console.error("[financials] GET error:", error);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }

      // データがない場合は空のデフォルト値を返す
      if (!data) {
        return NextResponse.json({
          ok: true,
          data: {
            year_month: yearMonth,
            net_sales: 0,
            drug_purchase: 0,
            cost_of_goods_sold: 0,
            personnel_expense: 0,
            advertising_expense: 0,
            packaging_shipping: 0,
            outsourcing_cost: 0,
            rent: 0,
            repairs: 0,
            supplies: 0,
            utilities: 0,
            travel_expense: 0,
            contractor_fee: 0,
            taxes_duties: 0,
            entertainment: 0,
            insurance: 0,
            communication: 0,
            membership_fee: 0,
            processing_fee: 0,
            miscellaneous: 0,
            notes: "",
          },
        });
      }

      return NextResponse.json({ ok: true, data });
    } else {
      // 直近12ヶ月分のデータを取得
      const { data, error } = await withTenant(
        supabase
          .from("monthly_financials")
          .select("*")
          .order("year_month", { ascending: false })
          .limit(12),
        tenantId
      );

      if (error) {
        console.error("[financials] GET list error:", error);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data: data || [] });
    }
  } catch (err) {
    console.error("[financials] GET exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// POST: 月次経理データ保存（upsert）
export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { year_month, ...financialData } = body;

    if (!year_month || !/^\d{4}-\d{2}$/.test(year_month)) {
      return NextResponse.json(
        { ok: false, error: "invalid_year_month", message: "year_month must be YYYY-MM format" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("monthly_financials")
      .upsert(
        {
          ...tenantPayload(tenantId),
          year_month,
          ...financialData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "year_month" }
      )
      .select()
      .single();

    if (error) {
      console.error("[financials] POST error:", error);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[financials] POST exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
