import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

// LINE APIからリッチメニュー詳細を取得
async function fetchLineRichMenuDetail(richMenuId: string) {
  if (!LINE_ACCESS_TOKEN) return null;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// DBまたはLINE APIからメニュー情報を構築
async function resolveRichMenu(richMenuId: string, isDefault: boolean) {
  // まずDBを確認
  const { data: dbMenu } = await supabaseAdmin
    .from("rich_menus")
    .select("id, name, image_url, line_rich_menu_id")
    .eq("line_rich_menu_id", richMenuId)
    .maybeSingle();

  if (dbMenu) {
    return {
      id: dbMenu.id,
      name: dbMenu.name,
      image_url: dbMenu.image_url,
      line_rich_menu_id: dbMenu.line_rich_menu_id,
      is_default: isDefault,
    };
  }

  // DBになければLINE APIから名前を取得、画像はプロキシURLを使用
  const detail = await fetchLineRichMenuDetail(richMenuId);
  return {
    line_rich_menu_id: richMenuId,
    name: detail?.name || (isDefault ? "デフォルトメニュー" : "リッチメニュー"),
    image_url: `/api/admin/line/richmenu-image?menu_id=${richMenuId}`,
    is_default: isDefault,
  };
}

// ユーザーに紐づくリッチメニューを取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  // patient_idからline_idを取得
  const { data: patient } = await supabaseAdmin
    .from("intake")
    .select("line_id")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!patient?.line_id) {
    return NextResponse.json({ menu: null });
  }

  if (!LINE_ACCESS_TOKEN) {
    return NextResponse.json({ menu: null });
  }

  // LINE APIでユーザーに紐づくリッチメニューIDを取得
  const lineRes = await fetch(`https://api.line.me/v2/bot/user/${patient.line_id}/richmenu`, {
    headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
    cache: "no-store",
  });

  if (!lineRes.ok) {
    // 404 = リッチメニュー未設定、デフォルトメニューを確認
    const defaultRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!defaultRes.ok) {
      return NextResponse.json({ menu: null });
    }
    const defaultData = await defaultRes.json();
    const defaultMenuId = defaultData.richMenuId;
    if (!defaultMenuId) return NextResponse.json({ menu: null });

    const menu = await resolveRichMenu(defaultMenuId, true);
    return NextResponse.json({ menu });
  }

  const lineData = await lineRes.json();
  const richMenuId = lineData.richMenuId;

  const menu = await resolveRichMenu(richMenuId, false);
  return NextResponse.json({ menu });
}
