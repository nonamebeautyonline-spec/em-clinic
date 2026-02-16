// lib/__tests__/line-push.test.ts
// LINE Push/Multicast 送信関数テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-line-token"),
}));

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  text: vi.fn().mockResolvedValue(""),
});
vi.stubGlobal("fetch", mockFetch);

// --- インポート ---
import { pushMessage, multicastMessage } from "@/lib/line-push";
import { getSettingOrEnv } from "@/lib/settings";

const testMessages = [{ type: "text" as const, text: "テストメッセージ" }];

describe("pushMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettingOrEnv as any).mockResolvedValue("test-line-token");
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(""),
    });
  });

  // 1. 正常送信 → Response返却
  it("正常送信 → Responseを返す", async () => {
    const res = await pushMessage("U_user_001", testMessages);

    expect(res).not.toBeNull();
    expect(res!.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-line-token",
        }),
        body: JSON.stringify({ to: "U_user_001", messages: testMessages }),
      })
    );
  });

  // 2. token空 → null
  it("token空 → nullを返す", async () => {
    (getSettingOrEnv as any).mockResolvedValue("");

    const res = await pushMessage("U_user_001", testMessages);

    expect(res).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 3. lineUserId空 → null
  it("lineUserId空 → nullを返す", async () => {
    const res = await pushMessage("", testMessages);

    expect(res).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 4. APIエラー → console.error + Response返却
  it("APIエラー → console.errorが呼ばれ、Responseを返す", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue("Bad Request"),
    });

    const res = await pushMessage("U_user_001", testMessages);

    expect(res).not.toBeNull();
    expect(res!.ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[LINE Push] Error 400"),
      expect.any(String)
    );
    errorSpy.mockRestore();
  });
});

describe("multicastMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettingOrEnv as any).mockResolvedValue("test-line-token");
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(""),
    });
  });

  // 5. 正常送信 → [Response]
  it("正常送信 → Response配列を返す", async () => {
    const userIds = ["U_001", "U_002", "U_003"];
    const results = await multicastMessage(userIds, testMessages);

    expect(results).not.toBeNull();
    expect(results!.length).toBe(1);
    expect(results![0].ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/multicast",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ to: userIds, messages: testMessages }),
      })
    );
  });

  // 6. 空配列 → null
  it("空配列 → nullを返す", async () => {
    const results = await multicastMessage([], testMessages);

    expect(results).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // 7. 501人 → 2バッチ（500+1）
  it("501人 → 2バッチ（500人+1人）に分割される", async () => {
    const userIds = Array.from({ length: 501 }, (_, i) => `U_${String(i).padStart(4, "0")}`);
    const results = await multicastMessage(userIds, testMessages);

    expect(results).not.toBeNull();
    expect(results!.length).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // 1回目: 500人
    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(firstCallBody.to.length).toBe(500);

    // 2回目: 1人
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondCallBody.to.length).toBe(1);
  });

  // 8. token空 → null
  it("token空 → nullを返す", async () => {
    (getSettingOrEnv as any).mockResolvedValue("");

    const results = await multicastMessage(["U_001"], testMessages);

    expect(results).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
