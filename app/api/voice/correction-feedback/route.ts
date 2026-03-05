// 音声認識補正フィードバックAPI
// ユーザーが補正結果を承認/修正した記録を保存
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenantId, tenantPayload } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { badRequest, serverError } from "@/lib/api-error";

/** フィードバック投入スキーマ */
const feedbackSchema = z.object({
  original_text: z.string().min(1, "元テキストを入力してください"),
  corrected_text: z.string().min(1, "補正テキストを入力してください"),
  user_edited_text: z.string().optional(),
  corrections: z.array(z.string()).optional(),
  was_accepted: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message);
      return badRequest(details.join(", "));
    }

    const { original_text, corrected_text, user_edited_text, corrections, was_accepted } = parsed.data;

    const { error } = await supabaseAdmin
      .from("correction_feedback")
      .insert({
        ...tenantPayload(tenantId),
        original_text,
        corrected_text,
        user_edited_text: user_edited_text || null,
        corrections: corrections ? JSON.stringify(corrections) : null,
        was_accepted,
      });

    if (error) {
      console.error("[correction-feedback] INSERT エラー:", error);
      return serverError("フィードバックの保存に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[correction-feedback] エラー:", err);
    return serverError("フィードバック保存中にエラーが発生しました");
  }
}
