// lib/validations/helpers.ts — Zodバリデーション共通ヘルパー
import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

/**
 * リクエストボディをZodスキーマで検証
 * 成功時: { data: T }
 * 失敗時: { error: NextResponse（400） }
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const raw = await req.json();
    const data = schema.parse(raw);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return {
        error: NextResponse.json(
          { ok: false, error: "入力値が不正です", details: messages },
          { status: 400 },
        ),
      };
    }
    // JSONパースエラー等
    return {
      error: NextResponse.json(
        { ok: false, error: "リクエストの形式が不正です" },
        { status: 400 },
      ),
    };
  }
}

/**
 * パース済みデータをZodスキーマで検証（req.json()を先に呼んだ場合に使用）
 * 成功時: { data: T }
 * 失敗時: { error: NextResponse（400） }
 */
export function validateBody<T>(
  raw: unknown,
  schema: ZodSchema<T>,
): { data: T; error?: never } | { data?: never; error: NextResponse } {
  try {
    const data = schema.parse(raw);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      return {
        error: NextResponse.json(
          { ok: false, error: "入力値が不正です", details: messages },
          { status: 400 },
        ),
      };
    }
    return {
      error: NextResponse.json(
        { ok: false, error: "リクエストの形式が不正です" },
        { status: 400 },
      ),
    };
  }
}
