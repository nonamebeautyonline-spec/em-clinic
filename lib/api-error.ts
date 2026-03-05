// lib/api-error.ts — 統一エラーレスポンスヘルパー
// 全APIルートで共通のエラー形式を使用する

import { NextResponse } from "next/server";

/** 統一エラーレスポンス型 */
export interface ApiErrorBody {
  ok: false;
  error: string; // エラーコード（機械可読）: "UNAUTHORIZED", "BAD_REQUEST" 等
  message: string; // 人間可読メッセージ（日本語）
  details?: string[]; // バリデーション詳細等
}

/** 統一エラーレスポンス生成 */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: string[],
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { ok: false, error: code, message };
  if (details && details.length > 0) body.details = details;
  return NextResponse.json(body, { status });
}

// --- 頻出パターンのショートカット ---

/** 401 認証エラー */
export function unauthorized(
  message = "認証が必要です",
): NextResponse<ApiErrorBody> {
  return apiError(401, "UNAUTHORIZED", message);
}

/** 403 権限不足 */
export function forbidden(
  message = "権限がありません",
): NextResponse<ApiErrorBody> {
  return apiError(403, "FORBIDDEN", message);
}

/** 400 不正リクエスト */
export function badRequest(message: string): NextResponse<ApiErrorBody> {
  return apiError(400, "BAD_REQUEST", message);
}

/** 400 バリデーションエラー */
export function validationError(
  details: string[],
  message = "入力値が不正です",
): NextResponse<ApiErrorBody> {
  return apiError(400, "VALIDATION_ERROR", message, details);
}

/** 404 リソース未検出 */
export function notFound(message: string): NextResponse<ApiErrorBody> {
  return apiError(404, "NOT_FOUND", message);
}

/** 409 競合エラー */
export function conflict(message: string): NextResponse<ApiErrorBody> {
  return apiError(409, "CONFLICT", message);
}

/** 429 レート制限 */
export function tooManyRequests(
  message = "リクエストが多すぎます",
): NextResponse<ApiErrorBody> {
  return apiError(429, "TOO_MANY_REQUESTS", message);
}

/** 500 サーバーエラー */
export function serverError(
  message = "予期しないエラーが発生しました",
): NextResponse<ApiErrorBody> {
  return apiError(500, "SERVER_ERROR", message);
}
