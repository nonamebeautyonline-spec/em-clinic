import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { jwtVerify } from "jose";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

// 短いID生成（英数字のみ、8文字）
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 8);

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
    if (token === process.env.ADMIN_TOKEN) {
      return true;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
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
