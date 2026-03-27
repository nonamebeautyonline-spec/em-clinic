// lib/__tests__/ai-flex-generate.test.ts — AI Flex Message生成APIのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantIdOrThrow: vi.fn().mockReturnValue("00000000-0000-0000-0000-000000000001"),
  strictWithTenant: vi.fn().mockImplementation((query) => query),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("test-api-key"),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// --- テスト対象の静的import ---
import { POST } from "@/app/api/admin/line/flex-builder/ai-generate/route";

// --- ヘルパー ---
function createRequest(body: unknown) {
  return new Request("http://localhost/api/admin/line/flex-builder/ai-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("AI Flex Message生成API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: Flex JSONを正しく生成・返却する", async () => {
    const flexJson = {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#06C755", paddingAll: "16px",
        contents: [{ type: "text", text: "テスト", color: "#ffffff", weight: "bold", size: "lg" }],
      },
      body: {
        type: "box", layout: "vertical", spacing: "md",
        contents: [{ type: "text", text: "本文", size: "sm", wrap: true }],
      },
    };

    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '```json\n' + JSON.stringify({ name: "テスト通知", flexJson }) + '\n```',
      }],
    });

    const res = await POST(createRequest({ prompt: "テスト通知を作成して" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.name).toBe("テスト通知");
    expect(data.flexJson.type).toBe("bubble");
    expect(data.flexJson.header.contents[0].text).toBe("テスト");
  });

  it("promptが空の場合400エラー", async () => {
    const res = await POST(createRequest({ prompt: "" }));
    expect(res.status).toBe(400);
  });

  it("promptがない場合400エラー", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it("Claude APIがコードブロックなしでJSONを返した場合も抽出できる", async () => {
    const flexJson = { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };

    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: JSON.stringify({ name: "直接JSON", flexJson }),
      }],
    });

    const res = await POST(createRequest({ prompt: "シンプルなメッセージ" }));
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.name).toBe("直接JSON");
  });

  it("Claude APIエラー時に500を返す", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API Error"));

    const res = await POST(createRequest({ prompt: "テスト" }));
    expect(res.status).toBe(500);
  });

  it("nameが空の場合デフォルト名を使用する", async () => {
    const flexJson = { type: "bubble", body: { type: "box", layout: "vertical", contents: [] } };

    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '```json\n' + JSON.stringify({ name: "", flexJson }) + '\n```',
      }],
    });

    const res = await POST(createRequest({ prompt: "テスト" }));
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.name).toBe("AI生成メッセージ");
  });

  it("編集モード: currentFlexJsonを渡すとプロンプトに含まれる", async () => {
    const currentFlex = {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: "#06C755", contents: [] },
      body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "元のテキスト" }] },
    };
    const updatedFlex = {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: "#FF6B6B", contents: [] },
      body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "元のテキスト" }] },
    };

    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '```json\n' + JSON.stringify({ name: "修正済み", flexJson: updatedFlex }) + '\n```',
      }],
    });

    const res = await POST(createRequest({
      prompt: "ヘッダーを赤にして",
      currentFlexJson: currentFlex,
    }));
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.flexJson.header.backgroundColor).toBe("#FF6B6B");

    // Claude APIに渡されたメッセージに現在のFlexが含まれていることを確認
    const calledMessages = mockCreate.mock.calls[0][0].messages;
    expect(calledMessages[0].content).toContain("現在のFlex Messageを以下の指示に従って修正してください");
    expect(calledMessages[0].content).toContain("#06C755");
  });

  it("画像URL付きリクエストでプロンプトに画像情報が含まれる", async () => {
    const flexJson = {
      type: "bubble",
      hero: { type: "image", url: "https://example.com/photo.jpg", size: "full", aspectRatio: "2:1", aspectMode: "cover" },
      body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "画像付き" }] },
    };

    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '```json\n' + JSON.stringify({ name: "画像付きメッセージ", flexJson }) + '\n```',
      }],
    });

    const res = await POST(createRequest({
      prompt: "この画像をヘッダーに配置して",
      imageUrls: ["https://example.com/photo.jpg"],
    }));
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.flexJson.hero.url).toBe("https://example.com/photo.jpg");

    const calledMessages = mockCreate.mock.calls[0][0].messages;
    expect(calledMessages[0].content).toContain("https://example.com/photo.jpg");
    expect(calledMessages[0].content).toContain("使用する画像URL");
  });
});
