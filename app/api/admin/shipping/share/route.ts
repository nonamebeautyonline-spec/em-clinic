import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 短いID生成（英数字のみ、8文字）
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 8);

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const adminToken = process.env.ADMIN_TOKEN;

    if (!token || token !== adminToken) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    const body = await req.json();
    const { data } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: "無効なデータ" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 短いIDを生成
    const shareId = nanoid();

    // 3日後に期限切れ
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    // データを保存
    const { error } = await supabase.from("shipping_shares").insert({
      id: shareId,
      data: data,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error("[Share] Insert error:", error);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    console.log(`[Share] Created share: ${shareId}, expires: ${expiresAt.toISOString()}`);

    return NextResponse.json({ shareId });
  } catch (e: any) {
    console.error("[Share] Error:", e);
    return NextResponse.json({ error: e?.message || "サーバーエラー" }, { status: 500 });
  }
}
