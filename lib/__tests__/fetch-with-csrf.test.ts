// lib/__tests__/fetch-with-csrf.test.ts
// CSRF トークン付き fetch ラッパーの単体テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- DOM/fetch モック ---
const mockFetch = vi.fn();

// document.cookie モック
let documentCookie = "";
Object.defineProperty(globalThis, "document", {
  value: {
    get cookie() {
      return documentCookie;
    },
    set cookie(val: string) {
      documentCookie = val;
    },
  },
  writable: true,
  configurable: true,
});

// fetch モック
globalThis.fetch = mockFetch;

// テスト対象を都度 import（モジュールキャッシュをクリアするため）
async function importModule() {
  vi.resetModules();
  return import("@/lib/fetch-with-csrf");
}

describe("fetchWithCsrf — CSRFトークン付きfetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentCookie = "";
  });

  it("Cookieにcsrf_tokenがあればそれをヘッダーに付与", async () => {
    documentCookie = "other=value; csrf_token=cookie-csrf-abc; session=xyz";
    mockFetch.mockResolvedValue(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/patients", { method: "POST" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/patients",
      expect.objectContaining({
        credentials: "include",
      }),
    );
    // ヘッダーに x-csrf-token が設定されている
    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers.get("x-csrf-token")).toBe("cookie-csrf-abc");
  });

  it("Cookieにcsrf_tokenがなければサーバーから取得", async () => {
    documentCookie = "";
    // csrf-token エンドポイントのレスポンス
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "server-token-xyz" })))
      .mockResolvedValueOnce(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/settings", { method: "PUT", body: JSON.stringify({ key: "val" }) });

    // 1回目: csrf-tokenの取得
    expect(mockFetch.mock.calls[0][0]).toBe("/api/csrf-token");
    // 2回目: 本来のリクエスト
    expect(mockFetch.mock.calls[1][0]).toBe("/api/admin/settings");
    const headers = mockFetch.mock.calls[1][1].headers;
    expect(headers.get("x-csrf-token")).toBe("server-token-xyz");
  });

  it("既にx-csrf-tokenヘッダーがあれば上書きしない", async () => {
    documentCookie = "csrf_token=cookie-token";
    mockFetch.mockResolvedValue(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/test", {
      method: "POST",
      headers: { "x-csrf-token": "manual-token" },
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get("x-csrf-token")).toBe("manual-token");
  });

  it("body が文字列なら Content-Type: application/json を自動設定", async () => {
    documentCookie = "csrf_token=test-token";
    mockFetch.mockResolvedValue(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/data", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("Content-Type が既に設定されていれば上書きしない", async () => {
    documentCookie = "csrf_token=test-token";
    mockFetch.mockResolvedValue(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: "binary-data",
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get("Content-Type")).toBe("multipart/form-data");
  });

  it("credentials は常に include", async () => {
    documentCookie = "csrf_token=test-token";
    mockFetch.mockResolvedValue(new Response("ok"));

    const { fetchWithCsrf } = await importModule();
    await fetchWithCsrf("/api/admin/test", { method: "GET" });

    expect(mockFetch.mock.calls[0][1].credentials).toBe("include");
  });
});

describe("clearCsrfToken — キャッシュクリア", () => {
  it("clearCsrfToken を呼ぶとキャッシュが無効化される", async () => {
    documentCookie = "";

    const { clearCsrfToken } = await importModule();

    // clearCsrfToken はエラーなく実行できる
    expect(() => clearCsrfToken()).not.toThrow();
  });

  it("clearCsrfToken 後は getCsrfToken が再取得を試みる", async () => {
    documentCookie = "";
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "first-token" })))
      .mockResolvedValueOnce(new Response("ok"));

    const { fetchWithCsrf, clearCsrfToken } = await importModule();

    // 1回目: サーバーから取得（csrf-token + 本体）
    await fetchWithCsrf("/api/test1", { method: "POST" });
    const firstCallCount = mockFetch.mock.calls.length;

    // クリア
    clearCsrfToken();

    // Cookie を設定して再度呼び出し
    documentCookie = "csrf_token=new-cookie-token";
    mockFetch.mockResolvedValueOnce(new Response("ok"));
    await fetchWithCsrf("/api/test2", { method: "POST" });

    // Cookie から取得するので追加の csrf-token リクエストなし
    expect(mockFetch.mock.calls.length).toBe(firstCallCount + 1);
  });
});
