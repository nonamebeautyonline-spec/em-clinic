// AIカルテ生成API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Claude API モック ---
const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function AnthropicMock() {
    return {
      messages: {
        create: mockMessagesCreate,
      },
    };
  }),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "test-api-key"),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn(() => ({ data: [], error: null })),
}));

beforeEach(() => {
  vi.resetModules();
  mockMessagesCreate.mockReset();
});

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/voice/generate-karte", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/voice/generate-karte", () => {
  it("SOAP形式カルテを生成できる", async () => {
    const soapResult = {
      soap: {
        S: "前回の薬で副作用なし、効果も感じている",
        O: "体調良好、特記事項なし",
        A: "マンジャロ2.5mg継続適応",
        P: "同用量で継続処方",
      },
      summary: "マンジャロ2.5mg継続処方",
      medications: ["マンジャロ"],
    };

    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify(soapResult),
      }],
    });

    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({
      transcript: "はい、前回のお薬で副作用は特になかったですか？ はい、大丈夫でした。効果も感じています。では同じ用量で続けましょう。",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.soap.S).toContain("副作用なし");
    expect(body.soap.P).toContain("継続処方");
    expect(body.medications).toContain("マンジャロ");
    expect(body.karte).toContain("【S】");
    expect(body.karte).toContain("【P】");
  });

  it("テキストなしの場合は400を返す", async () => {
    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({});
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("テキスト");
  });

  it("テキストが短すぎる場合は400を返す", async () => {
    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({ transcript: "短い" });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("10文字");
  });

  it("Claude API エラー時は500を返す", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("Claude API down"));

    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({
      transcript: "マンジャロ2.5mgを処方します。副作用はありませんでしたか？",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it("JSON解析失敗時はフリーテキストカルテとして返す", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: "マンジャロ2.5mg継続処方。副作用なし。",
      }],
    });

    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({
      transcript: "前回のお薬で副作用はありませんでしたか",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.format).toBe("freetext");
  });

  it("Sonnet モデルを使用する", async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: JSON.stringify({
          soap: { S: "", O: "", A: "", P: "" },
          summary: "",
          medications: [],
        }),
      }],
    });

    const { POST } = await import("@/app/api/voice/generate-karte/route");
    const req = createRequest({
      transcript: "テスト用の十分な長さのテキストです",
    });
    await POST(req as any);

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
      })
    );
  });
});
