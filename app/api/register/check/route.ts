import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 個人情報フォームが既に提出済みかチェック
 * - line_user_id cookie から紐づく患者を検索
 * - 氏名が登録済みなら registered: true
 */
export async function GET(req: NextRequest) {
  const lineUserId = req.cookies.get("line_user_id")?.value || "";

  if (!lineUserId) {
    return NextResponse.json({ registered: false, needsLineLogin: true });
  }

  // line_idで intake を検索 → 正式IDの患者が存在するか
  const { data: intake } = await supabaseAdmin
    .from("intake")
    .select("patient_id")
    .eq("line_id", lineUserId)
    .not("patient_id", "like", "LINE_%")
    .limit(1)
    .maybeSingle();

  if (!intake?.patient_id) {
    return NextResponse.json({ registered: false });
  }

  // answerers に名前が入っているか確認
  const { data: answerer } = await supabaseAdmin
    .from("answerers")
    .select("name")
    .eq("patient_id", intake.patient_id)
    .maybeSingle();

  if (answerer?.name) {
    return NextResponse.json({ registered: true });
  }

  return NextResponse.json({ registered: false });
}
