// lib/__tests__/line-richmenu.test.ts
// LINE リッチメニュー API ヘルパーのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- fetch モック ---
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- settings モック ---
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(async () => "test-token"),
}));

import {
  createLineRichMenu,
  uploadRichMenuImage,
  deleteLineRichMenu,
  linkRichMenuToUser,
  bulkLinkRichMenu,
  setDefaultRichMenu,
} from "@/lib/line-richmenu";

import { getSettingOrEnv } from "@/lib/settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSettingOrEnv).mockResolvedValue("test-token");
});

// ============================================================
// createLineRichMenu
// ============================================================
describe("createLineRichMenu", () => {
  const validMenu = {
    name: "テストメニュー",
    chat_bar_text: "メニュー",
    selected: true,
    size_type: "full",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: "message" as const, text: "左エリア" },
      },
    ],
  };

  it("正常: richMenuIdを返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-12345" }),
    });

    const result = await createLineRichMenu(validMenu, "https://app.example.com");

    expect(result).toBe("richmenu-12345");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/richmenu",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("トークンなし → null を返す", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await createLineRichMenu(validMenu, "https://app.example.com");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("LINE API エラー → null を返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createLineRichMenu(validMenu, "https://app.example.com");
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("half サイズ → height 843", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-half" }),
    });

    const halfMenu = { ...validMenu, size_type: "half" };
    await createLineRichMenu(halfMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.size.height).toBe(843);
  });

  it("full サイズ → height 1686", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-full" }),
    });

    await createLineRichMenu(validMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.size.height).toBe(1686);
  });

  it("areas が空 → デフォルトエリアが追加される", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-default" }),
    });

    const emptyAreasMenu = { ...validMenu, areas: [] };
    await createLineRichMenu(emptyAreasMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.areas.length).toBe(1);
    expect(body.areas[0].action.type).toBe("message");
    expect(body.areas[0].action.text).toBe("メニュー");
  });

  it("名前は300文字に切り詰められる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-long" }),
    });

    const longNameMenu = { ...validMenu, name: "あ".repeat(500) };
    await createLineRichMenu(longNameMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.name.length).toBe(300);
  });

  it("chatBarText は14文字に切り詰められる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-chat" }),
    });

    const longChatMenu = { ...validMenu, chat_bar_text: "あ".repeat(20) };
    await createLineRichMenu(longChatMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.chatBarText.length).toBe(14);
  });

  it("負の bounds 値 → 0 にクランプされる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-clamp" }),
    });

    const clampMenu = {
      ...validMenu,
      areas: [
        {
          bounds: { x: -10, y: -20, width: 500, height: 400 },
          action: { type: "message" as const, text: "テスト" },
        },
      ],
    };
    await createLineRichMenu(clampMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.areas[0].bounds.x).toBe(0);
    expect(body.areas[0].bounds.y).toBe(0);
  });

  it("form アクション → /forms/slug の URI に変換", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ richMenuId: "richmenu-form" }),
    });

    const formMenu = {
      ...validMenu,
      areas: [
        {
          bounds: { x: 0, y: 0, width: 2500, height: 1686 },
          action: { type: "form" as const, formSlug: "intake-form" },
        },
      ],
    };
    await createLineRichMenu(formMenu, "https://app.example.com");

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.areas[0].action.uri).toBe("https://app.example.com/forms/intake-form");
  });
});

// ============================================================
// uploadRichMenuImage
// ============================================================
describe("uploadRichMenuImage", () => {
  it("正常: 画像ダウンロード + アップロード成功 → true", async () => {
    // 1回目: 画像ダウンロード
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new ArrayBuffer(100),
    });
    // 2回目: LINEにアップロード
    mockFetch.mockResolvedValueOnce({ ok: true });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await uploadRichMenuImage("richmenu-1", "https://example.com/img.png", 1);
    expect(result).toBe(true);
    consoleSpy.mockRestore();
  });

  it("トークンなし → false", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await uploadRichMenuImage("richmenu-1", "https://example.com/img.png");
    expect(result).toBe(false);
  });

  it("imageUrl が空 → false", async () => {
    const result = await uploadRichMenuImage("richmenu-1", "");
    expect(result).toBe(false);
  });

  it("リトライ成功: 1回目失敗、2回目成功 → true", async () => {
    // 1回目: ダウンロード失敗
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // 2回目: ダウンロード成功
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new ArrayBuffer(50),
    });
    // 3回目: アップロード成功
    mockFetch.mockResolvedValueOnce({ ok: true });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await uploadRichMenuImage("richmenu-1", "https://example.com/img.png", 2);
    expect(result).toBe(true);
    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("全リトライ失敗 → false", async () => {
    // 3回全てダウンロード失敗
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await uploadRichMenuImage("richmenu-1", "https://example.com/img.png", 3);
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it("アップロード失敗 → リトライ後false", async () => {
    // ダウンロード成功、アップロード失敗を繰り返す
    for (let i = 0; i < 2; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "image/png" },
        arrayBuffer: async () => new ArrayBuffer(50),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server Error",
      });
    }

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await uploadRichMenuImage("richmenu-1", "https://example.com/img.png", 2);
    expect(result).toBe(false);
    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});

// ============================================================
// deleteLineRichMenu
// ============================================================
describe("deleteLineRichMenu", () => {
  it("正常: 削除成功 → true", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await deleteLineRichMenu("richmenu-1");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/richmenu/richmenu-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("削除失敗 → false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await deleteLineRichMenu("richmenu-notfound");
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it("トークンなし → false", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await deleteLineRichMenu("richmenu-1");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("richMenuId が空 → false", async () => {
    const result = await deleteLineRichMenu("");
    expect(result).toBe(false);
  });
});

// ============================================================
// linkRichMenuToUser
// ============================================================
describe("linkRichMenuToUser", () => {
  it("正常 → true", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await linkRichMenuToUser("U1234", "richmenu-1");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/user/U1234/richmenu/richmenu-1",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("失敗 → false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await linkRichMenuToUser("U1234", "richmenu-1");
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it("パラメータ不足 → false", async () => {
    const result = await linkRichMenuToUser("", "richmenu-1");
    expect(result).toBe(false);
  });
});

// ============================================================
// bulkLinkRichMenu
// ============================================================
describe("bulkLinkRichMenu", () => {
  it("500人以下 → 1バッチで成功", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const userIds = Array.from({ length: 100 }, (_, i) => `U${i}`);
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 100, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("500人超 → 複数バッチに分割", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const userIds = Array.from({ length: 750 }, (_, i) => `U${i}`);
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 750, failed: 0 });
    // 500 + 250 = 2バッチ
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("バルク失敗 → 個別フォールバック", async () => {
    // バルク失敗
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // 個別は全部成功
    mockFetch.mockResolvedValue({ ok: true });

    const userIds = ["U1", "U2", "U3"];
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 3, failed: 0 });
    // 1回バルク + 3回個別 = 4回
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("バルク失敗 + 個別も一部失敗", async () => {
    // バルク失敗
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // 個別: 2成功, 1失敗
    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    mockFetch.mockResolvedValueOnce({ ok: true });

    const userIds = ["U1", "U2", "U3"];
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 2, failed: 1 });
  });

  it("空配列 → { linked: 0, failed: 0 }", async () => {
    const result = await bulkLinkRichMenu([], "richmenu-1");
    expect(result).toEqual({ linked: 0, failed: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("トークンなし → { linked: 0, failed: 0 }", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await bulkLinkRichMenu(["U1"], "richmenu-1");
    expect(result).toEqual({ linked: 0, failed: 0 });
  });

  it("ちょうど500人 → 1バッチ", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const userIds = Array.from({ length: 500 }, (_, i) => `U${i}`);
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 500, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("501人 → 2バッチ (500 + 1)", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const userIds = Array.from({ length: 501 }, (_, i) => `U${i}`);
    const result = await bulkLinkRichMenu(userIds, "richmenu-1");

    expect(result).toEqual({ linked: 501, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// setDefaultRichMenu
// ============================================================
describe("setDefaultRichMenu", () => {
  it("正常 → true", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await setDefaultRichMenu("richmenu-1");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/user/all/richmenu/richmenu-1",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("失敗 → false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await setDefaultRichMenu("richmenu-1");
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it("トークンなし → false", async () => {
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const result = await setDefaultRichMenu("richmenu-1");
    expect(result).toBe(false);
  });

  it("richMenuId が空 → false", async () => {
    const result = await setDefaultRichMenu("");
    expect(result).toBe(false);
  });
});
