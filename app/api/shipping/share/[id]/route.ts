import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareId = params.id;

    if (!shareId) {
      return NextResponse.json({ error: "IDが無効です" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // データを取得
    const { data: share, error } = await supabase
      .from("shipping_shares")
      .select("data, expires_at")
      .eq("id", shareId)
      .single();

    if (error || !share) {
      console.error("[Share] Not found:", shareId);
      return NextResponse.json({ error: "共有リンクが見つかりません" }, { status: 404 });
    }

    // 有効期限をチェック
    const expiresAt = new Date(share.expires_at);
    if (expiresAt < new Date()) {
      console.log(`[Share] Expired: ${shareId}`);
      return NextResponse.json({ error: "共有リンクの有効期限が切れています" }, { status: 410 });
    }

    return NextResponse.json({ data: share.data });
  } catch (e: any) {
    console.error("[Share] Error:", e);
    return NextResponse.json({ error: e?.message || "サーバーエラー" }, { status: 500 });
  }
}
