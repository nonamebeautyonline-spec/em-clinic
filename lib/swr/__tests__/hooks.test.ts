import { describe, it, expect, vi, beforeEach } from "vitest";

// SWR モック（ファクトリ内はトップレベル変数を参照できないため直接定義）
vi.mock("swr", () => {
  const fn = vi.fn().mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: true,
    mutate: vi.fn(),
  });
  return { default: fn, __mockUseSWR: fn };
});

vi.mock("swr/mutation", () => {
  const fn = vi.fn().mockReturnValue({
    trigger: vi.fn(),
    isMutating: false,
  });
  return { default: fn, __mockUseSWRMutation: fn };
});

vi.mock("../mutation", () => {
  const fn = vi.fn();
  return { adminMutationFetcher: fn };
});

// モック後にインポート
import { useAdminSWR, useAdminMutation, usePolling } from "../hooks";
import { __mockUseSWR } from "swr";
import { __mockUseSWRMutation } from "swr/mutation";
import { adminMutationFetcher } from "../mutation";

const mockUseSWR = __mockUseSWR as unknown as ReturnType<typeof vi.fn>;
const mockUseSWRMutation = __mockUseSWRMutation as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルト戻り値を再設定
  mockUseSWR.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: true,
    mutate: vi.fn(),
  });
  mockUseSWRMutation.mockReturnValue({
    trigger: vi.fn(),
    isMutating: false,
  });
});

describe("useAdminSWR", () => {
  it("keyを渡してuseSWRを呼ぶ", () => {
    useAdminSWR("/api/admin/tags");

    expect(mockUseSWR).toHaveBeenCalledWith("/api/admin/tags", undefined);
  });

  it("keyがnullの場合もuseSWRに渡す（fetch無効化）", () => {
    useAdminSWR(null);

    expect(mockUseSWR).toHaveBeenCalledWith(null, undefined);
  });

  it("optionsをuseSWRに渡す", () => {
    const options = { revalidateOnFocus: true, dedupingInterval: 5000 };
    useAdminSWR("/api/admin/patients", options);

    expect(mockUseSWR).toHaveBeenCalledWith("/api/admin/patients", options);
  });

  it("useSWRの戻り値をそのまま返す", () => {
    const mockReturn = {
      data: { items: [1, 2, 3] },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };
    mockUseSWR.mockReturnValueOnce(mockReturn);

    const result = useAdminSWR<{ items: number[] }>("/api/admin/items");

    expect(result).toBe(mockReturn);
  });
});

describe("useAdminMutation", () => {
  it("keyとadminMutationFetcherを渡してuseSWRMutationを呼ぶ", () => {
    useAdminMutation("/api/admin/tags");

    expect(mockUseSWRMutation).toHaveBeenCalledWith(
      "/api/admin/tags",
      adminMutationFetcher,
      undefined,
    );
  });

  it("onSuccess/onErrorコールバックを渡す", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    useAdminMutation("/api/admin/tags", { onSuccess, onError });

    expect(mockUseSWRMutation).toHaveBeenCalledWith(
      "/api/admin/tags",
      adminMutationFetcher,
      { onSuccess, onError },
    );
  });

  it("useSWRMutationの戻り値をそのまま返す", () => {
    const mockReturn = {
      trigger: vi.fn(),
      isMutating: true,
    };
    mockUseSWRMutation.mockReturnValueOnce(mockReturn);

    const result = useAdminMutation("/api/admin/tags");

    expect(result).toBe(mockReturn);
  });
});

describe("usePolling", () => {
  it("refreshIntervalとrevalidateOnFocusをuseSWRに渡す", () => {
    usePolling("/api/admin/status", 3000);

    expect(mockUseSWR).toHaveBeenCalledWith("/api/admin/status", {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    });
  });

  it("keyがnullの場合もuseSWRに渡す", () => {
    usePolling(null, 5000);

    expect(mockUseSWR).toHaveBeenCalledWith(null, {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    });
  });

  it("追加optionsをマージする（optionsが優先）", () => {
    const options = { revalidateOnFocus: false, dedupingInterval: 1000 };
    usePolling("/api/admin/status", 3000, options);

    expect(mockUseSWR).toHaveBeenCalledWith("/api/admin/status", {
      refreshInterval: 3000,
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    });
  });

  it("useSWRの戻り値をそのまま返す", () => {
    const mockReturn = {
      data: { status: "ok" },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    };
    mockUseSWR.mockReturnValueOnce(mockReturn);

    const result = usePolling<{ status: string }>("/api/admin/status", 3000);

    expect(result).toBe(mockReturn);
  });
});
