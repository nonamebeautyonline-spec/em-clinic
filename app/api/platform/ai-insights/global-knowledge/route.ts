// プラットフォーム管理: グローバルナレッジベースCRUD
// tenant_id = NULL の ai_reply_examples を管理（全テナント共有の模範回答）

import { NextRequest, NextResponse } from "next/server";
import { forbidden, badRequest, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

// 一覧取得
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_reply_examples")
      .select("id, question, answer, source, used_count, created_at, updated_at")
      .is("tenant_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, examples: data || [] });
  } catch (error) {
    console.error("[global-knowledge] GET error:", error);
    return serverError("グローバルナレッジの取得に失敗しました");
  }
}

// 追加
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const body = await req.json();
    const { question, answer } = body;

    if (!question?.trim() || !answer?.trim()) {
      return badRequest("質問と回答は必須です");
    }

    // embedding生成（オプション — OpenAI APIキーがある場合のみ）
    let embedding = null;
    try {
      const { generateEmbedding } = await import("@/lib/embedding");
      embedding = await generateEmbedding(question);
    } catch {
      // embedding生成失敗は無視（APIキーなしの場合など）
    }

    const insertData: Record<string, unknown> = {
      tenant_id: null,
      question: question.trim(),
      answer: answer.trim(),
      source: "manual_reply",
      used_count: 0,
    };

    if (embedding) {
      insertData.embedding = JSON.stringify(embedding);
    }

    const { data, error } = await supabaseAdmin
      .from("ai_reply_examples")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, example: data });
  } catch (error) {
    console.error("[global-knowledge] POST error:", error);
    return serverError("グローバルナレッジの追加に失敗しました");
  }
}

// 更新
export async function PUT(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const body = await req.json();
    const { id, question, answer } = body;

    if (!id) return badRequest("IDは必須です");
    if (!question?.trim() || !answer?.trim()) {
      return badRequest("質問と回答は必須です");
    }

    // embedding再生成
    let embedding = null;
    try {
      const { generateEmbedding } = await import("@/lib/embedding");
      embedding = await generateEmbedding(question);
    } catch {
      // embedding生成失敗は無視
    }

    const updateData: Record<string, unknown> = {
      question: question.trim(),
      answer: answer.trim(),
      updated_at: new Date().toISOString(),
    };

    if (embedding) {
      updateData.embedding = JSON.stringify(embedding);
    }

    const { data, error } = await supabaseAdmin
      .from("ai_reply_examples")
      .update(updateData)
      .eq("id", id)
      .is("tenant_id", null)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, example: data });
  } catch (error) {
    console.error("[global-knowledge] PUT error:", error);
    return serverError("グローバルナレッジの更新に失敗しました");
  }
}

// 削除
export async function DELETE(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const { id } = await req.json();
    if (!id) return badRequest("IDは必須です");

    const { error } = await supabaseAdmin
      .from("ai_reply_examples")
      .delete()
      .eq("id", id)
      .is("tenant_id", null);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[global-knowledge] DELETE error:", error);
    return serverError("グローバルナレッジの削除に失敗しました");
  }
}
