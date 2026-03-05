import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError } from "@/lib/api-error";
import { createClient } from "@supabase/supabase-js";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;

    if (!shareId) {
      return badRequest("IDが無効です");
    }

    const tenantId = resolveTenantId(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // データを取得
    const { data: share, error } = await withTenant(
      supabase
        .from("shipping_shares")
        .select("data, expires_at")
        .eq("id", shareId),
      tenantId
    ).single();

    if (error || !share) {
      console.error("[Share] Not found:", shareId);
      return notFound("共有リンクが見つかりません");
    }

    // 有効期限をチェック
    const expiresAt = new Date(share.expires_at);
    if (expiresAt < new Date()) {
      console.log(`[Share] Expired: ${shareId}`);
      return NextResponse.json({ error: "共有リンクの有効期限が切れています" }, { status: 410 });
    }

    return NextResponse.json({ data: share.data });
  } catch (e) {
    console.error("[Share] Error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
