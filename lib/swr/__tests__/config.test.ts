import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adminFetcher, swrConfig } from "../config";
import type { SWRError } from "../config";
import { adminMutationFetcher } from "../mutation";

// window.fetch をモック
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("adminFetcher", () => {
  it("credentials: include を付与してfetchする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: [] }),
    });

    await adminFetcher("/api/admin/tags");

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/tags", {
      credentials: "include",
    });
  });

  it("正常レスポンスでJSONを返す", async () => {
    const expected = { tags: [{ id: 1, name: "テスト" }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => expected,
    });

    const result = await adminFetcher("/api/admin/tags");
    expect(result).toEqual(expected);
  });

  it("非OKレスポンスでSWRErrorをthrowする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    try {
      await adminFetcher("/api/admin/tags");
      expect.unreachable("エラーがthrowされるべき");
    } catch (err) {
      const swrErr = err as SWRError;
      expect(swrErr.message).toBe("API エラー");
      expect(swrErr.status).toBe(500);
      expect(swrErr.info).toEqual({ error: "Internal Server Error" });
    }
  });

  it("レスポンスボディがJSONでない場合もエラーをthrowする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => { throw new Error("not json"); },
    });

    try {
      await adminFetcher("/api/admin/tags");
      expect.unreachable("エラーがthrowされるべき");
    } catch (err) {
      const swrErr = err as SWRError;
      expect(swrErr.status).toBe(502);
      expect(swrErr.info).toBeNull();
    }
  });
});

describe("swrConfig", () => {
  it("revalidateOnFocusがfalse（医療データ保護）", () => {
    expect(swrConfig.revalidateOnFocus).toBe(false);
  });

  it("revalidateOnReconnectがtrue", () => {
    expect(swrConfig.revalidateOnReconnect).toBe(true);
  });

  it("errorRetryCountが3", () => {
    expect(swrConfig.errorRetryCount).toBe(3);
  });

  it("401エラーはリトライしない", () => {
    const shouldRetry = swrConfig.shouldRetryOnError as (err: unknown) => boolean;
    expect(shouldRetry({ status: 401 })).toBe(false);
  });

  it("403エラーはリトライしない", () => {
    const shouldRetry = swrConfig.shouldRetryOnError as (err: unknown) => boolean;
    expect(shouldRetry({ status: 403 })).toBe(false);
  });

  it("500エラーはリトライする", () => {
    const shouldRetry = swrConfig.shouldRetryOnError as (err: unknown) => boolean;
    expect(shouldRetry({ status: 500 })).toBe(true);
  });

  describe("onError", () => {
    const onError = swrConfig.onError as (error: unknown) => void;

    it("401エラーで /admin/login にリダイレクトする", () => {
      // node環境にwindowを作成
      const mockLocation = { href: "" };
      vi.stubGlobal("window", { location: mockLocation });

      onError({ status: 401 });

      expect(mockLocation.href).toBe("/admin/login");

      vi.unstubAllGlobals();
      // fetchモックを再設定（unstubAllGlobalsで消えるため）
      vi.stubGlobal("fetch", mockFetch);
    });

    it("401以外のエラーではリダイレクトしない", () => {
      const mockLocation = { href: "" };
      vi.stubGlobal("window", { location: mockLocation });

      onError({ status: 500 });

      expect(mockLocation.href).toBe("");

      vi.unstubAllGlobals();
      vi.stubGlobal("fetch", mockFetch);
    });

    it("エラーがundefinedでもクラッシュしない", () => {
      expect(() => onError(undefined)).not.toThrow();
    });

    it("windowがundefinedの場合（SSR）でもクラッシュしない", () => {
      // node環境ではwindowが未定義なのでそのままテスト
      expect(() => onError({ status: 401 })).not.toThrow();
    });
  });
});

describe("adminMutationFetcher", () => {
  it("POST + credentials: include + Content-Type: application/json で送信する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await adminMutationFetcher("/api/admin/tags", {
      arg: { body: { name: "新タグ", color: "#3B82F6" } },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/tags", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新タグ", color: "#3B82F6" }),
    });
  });

  it("methodを指定できる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await adminMutationFetcher("/api/admin/tags/1", {
      arg: { method: "PUT", body: { name: "更新タグ" } },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/tags/1", expect.objectContaining({
      method: "PUT",
    }));
  });

  it("bodyがnullの場合はbodyを送信しない", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await adminMutationFetcher("/api/admin/tags/1", {
      arg: { method: "DELETE" },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/tags/1", expect.objectContaining({
      method: "DELETE",
      body: undefined,
    }));
  });

  it("非OKレスポンスでSWRErrorをthrowする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad Request" }),
    });

    try {
      await adminMutationFetcher("/api/admin/tags", { arg: { body: {} } });
      expect.unreachable("エラーがthrowされるべき");
    } catch (err) {
      const swrErr = err as SWRError;
      expect(swrErr.status).toBe(400);
    }
  });
});
