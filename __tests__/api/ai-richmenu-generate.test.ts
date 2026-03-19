// __tests__/api/ai-richmenu-generate.test.ts
// リッチメニューAI自動生成APIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/validations/line-common", () => ({
  aiRichMenuGenerateSchema: {},
}));

vi.mock("@/lib/ai-richmenu-generator", () => ({
  generateRichMenuImage: vi.fn(),
}));

import { POST } from "@/app/api/admin/line/rich-menus/ai-generate/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { generateRichMenuImage } from "@/lib/ai-richmenu-generator";

describe("POST /api/admin/line/rich-menus/ai-generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合は401を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(false);

    const req = new NextRequest("http://localhost/api/admin/line/rich-menus/ai-generate", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("バリデーションエラーの場合はエラーレスポンスを返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    const errRes = Response.json({ error: "validation" }, { status: 400 });
    vi.mocked(parseBody).mockResolvedValue({ error: errRes });

    const req = new NextRequest("http://localhost/api/admin/line/rich-menus/ai-generate", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("正常にSVGが生成される", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    vi.mocked(parseBody).mockResolvedValue({
      data: {
        prompt: "クリニック向け6ボタン",
        sizeType: "full",
        buttonCount: 6,
        buttonLabels: ["予約", "問診", "マイページ", "お問合せ", "アクセス", "料金"],
      },
    });
    vi.mocked(generateRichMenuImage).mockResolvedValue({
      svg: '<svg viewBox="0 0 2500 1686"><rect fill="#fff" width="2500" height="1686"/></svg>',
      buttonLabels: ["予約", "問診", "マイページ", "お問合せ", "アクセス", "料金"],
    });

    const req = new NextRequest("http://localhost/api/admin/line/rich-menus/ai-generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.svg).toContain("<svg");
    expect(json.buttonLabels).toHaveLength(6);
  });

  it("ANTHROPIC_API_KEY未設定時は500を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    vi.mocked(parseBody).mockResolvedValue({
      data: { prompt: "test", sizeType: "full", buttonCount: 6 },
    });
    vi.mocked(generateRichMenuImage).mockRejectedValue(
      new Error("ANTHROPIC_API_KEY が未設定です")
    );

    const req = new NextRequest("http://localhost/api/admin/line/rich-menus/ai-generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).toContain("ANTHROPIC_API_KEY");
  });
});
