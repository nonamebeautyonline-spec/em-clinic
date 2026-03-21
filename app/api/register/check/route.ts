import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { verifyPatientSession } from "@/lib/patient-session";

/**
 * 個人情報フォームが既に提出済みかチェック
 * - JWT セッション or line_user_id cookie から紐づく患者を検索
 * - 氏名が登録済みなら registered: true
 */
export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  // JWT内のlineUserIdを優先、なければ旧Cookie
  const session = await verifyPatientSession(req);
  const lineUserId = session?.lineUserId || req.cookies.get("line_user_id")?.value || "";

  if (!lineUserId) {
    return NextResponse.json({ registered: false, needsLineLogin: true });
  }

  // patients テーブルの line_id で検索（intake に line_id カラムは存在しない）
  const { data: patient } = await withTenant(supabaseAdmin
    .from("patients")
    .select("patient_id, name, tel")
    .eq("line_id", lineUserId)
    .not("patient_id", "like", "LINE_%"), tenantId)
    .limit(1)
    .maybeSingle();

  if (!patient?.patient_id || !patient.name) {
    return NextResponse.json({ registered: false });
  }

  // 個人情報は提出済み → 電話認証も完了しているか？
  const verifyComplete = !!patient.tel;
  return NextResponse.json({ registered: true, verifyComplete });
}
