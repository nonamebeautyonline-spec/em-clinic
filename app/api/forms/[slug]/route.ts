import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 公開フォーム取得（認証不要、プレビューモードは管理者認証必要）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const isPreview = searchParams.get("preview") === "1";

  const { data: form, error } = await supabaseAdmin
    .from("forms")
    .select("id, title, description, fields, settings, is_published, slug")
    .eq("slug", slug)
    .single();

  if (error || !form) {
    return NextResponse.json({ error: "フォームが見つかりません" }, { status: 404 });
  }

  // プレビューモード：管理者認証が必要
  if (!form.is_published) {
    if (isPreview) {
      const isAuthorized = await verifyAdminAuth(req);
      if (!isAuthorized) {
        return NextResponse.json({ error: "このフォームは現在公開されていません" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "このフォームは現在公開されていません" }, { status: 403 });
    }
  }

  // 期限チェック
  const settings = (form.settings || {}) as Record<string, unknown>;
  if (settings.deadline) {
    const deadline = new Date(settings.deadline as string);
    if (deadline < new Date()) {
      return NextResponse.json({ error: "このフォームの回答期限は終了しました" }, { status: 403 });
    }
  }

  // 先着チェック
  if (settings.max_responses) {
    const { count } = await supabaseAdmin
      .from("form_responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form.id);
    if (count !== null && count >= (settings.max_responses as number)) {
      return NextResponse.json({ error: "このフォームは回答数の上限に達しました" }, { status: 403 });
    }
  }

  // 非表示フィールドをフィルタ
  const visibleFields = ((form.fields || []) as Array<Record<string, unknown>>).filter(
    f => !f.hidden
  );

  return NextResponse.json({
    form: {
      title: form.title,
      description: form.description,
      fields: visibleFields,
      settings: {
        confirm_dialog: settings.confirm_dialog,
        confirm_text: settings.confirm_text,
        confirm_button_text: settings.confirm_button_text,
      },
    },
  });
}
