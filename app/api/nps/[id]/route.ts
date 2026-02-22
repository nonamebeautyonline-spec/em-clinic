// app/api/nps/[id]/route.ts — NPS回答ページ用API（患者向け、認証不要）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { npsResponseSchema } from "@/lib/validations/nps";

// 調査情報取得（回答ページ表示用）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { data: survey } = await withTenant(
    supabaseAdmin.from("nps_surveys")
      .select("id, title, question_text, comment_label, thank_you_message")
      .eq("id", parseInt(id))
      .eq("is_active", true)
      .single(),
    tenantId
  );

  if (!survey) {
    return NextResponse.json({ error: "調査が見つかりません" }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

// 回答送信
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, npsResponseSchema);
  if ("error" in parsed) return parsed.error;
  const { score, comment, patient_id } = parsed.data;

  // 調査の存在確認
  const { data: survey } = await withTenant(
    supabaseAdmin.from("nps_surveys").select("id").eq("id", parseInt(id)).eq("is_active", true).single(),
    tenantId
  );

  if (!survey) {
    return NextResponse.json({ error: "調査が見つかりません" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("nps_responses").insert({
    ...tenantPayload(tenantId),
    survey_id: parseInt(id),
    patient_id: patient_id || null,
    score: Number(score),
    comment: comment || "",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
