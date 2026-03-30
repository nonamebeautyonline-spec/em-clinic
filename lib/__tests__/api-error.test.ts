// lib/__tests__/api-error.test.ts
// 統一エラーレスポンスヘルパーのテスト
import { describe, it, expect, vi } from "vitest";

// NextResponseをモック
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import {
  apiError,
  unauthorized,
  forbidden,
  badRequest,
  validationError,
  notFound,
  conflict,
  tooManyRequests,
  serverError,
} from "@/lib/api-error";

describe("apiError", () => {
  it("基本的なエラーレスポンスを生成する", () => {
    const res = apiError(400, "BAD_REQUEST", "不正なリクエスト") as any;
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("BAD_REQUEST");
    expect(res.body.message).toBe("不正なリクエスト");
    expect(res.body.details).toBeUndefined();
  });

  it("detailsが空配列の場合はdetailsを含めない", () => {
    const res = apiError(400, "ERR", "msg", []) as any;
    expect(res.body.details).toBeUndefined();
  });

  it("detailsが非空の場合はdetailsを含める", () => {
    const res = apiError(400, "ERR", "msg", ["a", "b"]) as any;
    expect(res.body.details).toEqual(["a", "b"]);
  });
});

describe("unauthorized", () => {
  it("401レスポンスを返す", () => {
    const res = unauthorized() as any;
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
    expect(res.body.message).toBe("認証が必要です");
  });

  it("カスタムメッセージを指定できる", () => {
    const res = unauthorized("セッション切れ") as any;
    expect(res.body.message).toBe("セッション切れ");
  });
});

describe("forbidden", () => {
  it("403レスポンスを返す", () => {
    const res = forbidden() as any;
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });
});

describe("badRequest", () => {
  it("400レスポンスを返す", () => {
    const res = badRequest("パラメータ不足") as any;
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUEST");
    expect(res.body.message).toBe("パラメータ不足");
  });
});

describe("validationError", () => {
  it("400レスポンスにdetailsを含める", () => {
    const res = validationError(["名前は必須", "メールが不正"]) as any;
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.details).toEqual(["名前は必須", "メールが不正"]);
  });

  it("カスタムメッセージを指定できる", () => {
    const res = validationError(["err"], "検証失敗") as any;
    expect(res.body.message).toBe("検証失敗");
  });
});

describe("notFound", () => {
  it("404レスポンスを返す", () => {
    const res = notFound("患者が見つかりません") as any;
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });
});

describe("conflict", () => {
  it("409レスポンスを返す", () => {
    const res = conflict("既に存在します") as any;
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("CONFLICT");
  });
});

describe("tooManyRequests", () => {
  it("429レスポンスを返す", () => {
    const res = tooManyRequests() as any;
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("TOO_MANY_REQUESTS");
  });
});

describe("serverError", () => {
  it("500レスポンスを返す", () => {
    const res = serverError() as any;
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("SERVER_ERROR");
    expect(res.body.message).toBe("予期しないエラーが発生しました");
  });
});
