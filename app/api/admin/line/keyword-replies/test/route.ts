// app/api/admin/line/keyword-replies/test/route.ts — キーワードマッチテスト
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "テスト文字列は必須です" }, { status: 400 });

  // 有効なルールを優先順位順に取得
  const { data: rules, error } = await supabaseAdmin
    .from("keyword_auto_replies")
    .select("*")
    .eq("is_enabled", true)
    .order("priority", { ascending: false })
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // マッチ判定
  for (const rule of rules || []) {
    let matched = false;
    switch (rule.match_type) {
      case "exact":
        matched = text.trim() === rule.keyword;
        break;
      case "partial":
        matched = text.includes(rule.keyword);
        break;
      case "regex":
        try { matched = new RegExp(rule.keyword).test(text); } catch { matched = false; }
        break;
    }
    if (matched) {
      return NextResponse.json({
        matched: true,
        rule: { id: rule.id, name: rule.name, keyword: rule.keyword, match_type: rule.match_type, reply_type: rule.reply_type, reply_text: rule.reply_text },
      });
    }
  }

  return NextResponse.json({ matched: false, rule: null });
}
