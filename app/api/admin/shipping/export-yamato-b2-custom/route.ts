import { NextRequest, NextResponse } from "next/server";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 管理者認証チェック（クッキーまたはBearerトークン）
async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  // 1. クッキーベースのセッション認証
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return true;
    } catch {
      // クッキー無効、次の方式を試す
    }
  }

  // 2. Bearerトークン認証（後方互換性）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === ADMIN_TOKEN) {
      return true;
    }
  }

  return false;
}

interface CustomShippingItem {
  payment_id: string;
  name: string;
  postal: string;
  address: string;
  email: string;
  phone: string;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items: CustomShippingItem[] = body.items || [];
    const allPaymentIds: string[] = body.all_payment_ids || items.map((item) => item.payment_id);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    console.log(`[ExportYamatoB2Custom] Exporting ${items.length} items (marking ${allPaymentIds.length} orders)`);

    // 出荷予定日（今日の日付 yyyy/MM/dd）
    const today = new Date();
    const shipDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(
      today.getDate()
    ).padStart(2, "0")}`;

    // CSV生成
    const csv = generateYamatoB2Csv(items, shipDate);

    // ★ CSV出力後、注文の shipping_list_created_at を更新（統合前を含む全payment_id）
    const now = new Date().toISOString();

    console.log(`[ExportYamatoB2Custom] Marking ${allPaymentIds.length} orders as list_created`);

    const { data: updatedOrders, error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_list_created_at: now,
        updated_at: now,
      })
      .in("id", allPaymentIds)
      .select("patient_id");

    if (updateError) {
      console.error("[ExportYamatoB2Custom] Failed to update orders:", updateError);
      // エラーでもCSVは返す（重要な操作ではない）
    } else if (updatedOrders && updatedOrders.length > 0) {
      console.log(`[ExportYamatoB2Custom] Updated ${updatedOrders.length} orders`);

      // ★ キャッシュ無効化
      const patientIds = Array.from(new Set(updatedOrders.map((o: any) => o.patient_id)));
      console.log(`[ExportYamatoB2Custom] Invalidating cache for ${patientIds.length} patients`);

      const invalidateUrl = `${req.nextUrl.origin}/api/admin/invalidate-cache`;
      const invalidatePromises = patientIds.map((patientId) =>
        fetch(invalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ patient_id: patientId }),
        }).catch((err) => {
          console.error(`[ExportYamatoB2Custom] Cache invalidation failed for ${patientId}:`, err);
        })
      );

      await Promise.allSettled(invalidatePromises);
    }

    // CSVをレスポンスとして返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=UTF-8",
        "Content-Disposition": `attachment; filename="yamato_b2_${today.toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[ExportYamatoB2Custom] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
