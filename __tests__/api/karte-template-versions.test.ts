import { describe, it, expect, vi, beforeEach } from "vitest";

// モック
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "00000000-0000-0000-0000-000000000001" })),
}));

import { GET, POST } from "@/app/api/admin/karte-template-versions/route";
import { NextRequest } from "next/server";

function createChainMock(resolvedValue = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "neq", "order", "limit", "single"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve);
  return chain;
}

describe("GET /api/admin/karte-template-versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("template_id 未指定で400エラー", async () => {
    const req = new NextRequest("http://localhost/api/admin/karte-template-versions");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("バージョン履歴を取得できる", async () => {
    const versions = [
      { id: 1, template_id: 5, version: 2, name: "テスト", category: "general", body: "旧版", changed_by: null, created_at: "2026-01-01" },
      { id: 2, template_id: 5, version: 1, name: "テスト", category: "general", body: "初版", changed_by: null, created_at: "2025-12-01" },
    ];
    const chain = createChainMock({ data: versions, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-template-versions?template_id=5");
    const res = await GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.versions).toHaveLength(2);
  });
});

describe("POST /api/admin/karte-template-versions（復元）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在しないバージョンで404", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-template-versions", {
      method: "POST",
      body: JSON.stringify({ template_id: 5, version_id: 999 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("正常に復元できる", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "karte_template_versions") {
        callCount++;
        if (callCount === 1) {
          // 復元元バージョン取得
          return createChainMock({ data: { body: "旧版テキスト", name: "テンプレA", category: "general" }, error: null });
        }
        // バージョン保存(INSERT)
        return createChainMock({ data: null, error: null });
      }
      // karte_templates
      if (callCount <= 2) {
        // 現在のテンプレート取得
        return createChainMock({ data: { id: 5, name: "テンプレA", category: "general", body: "現行版", current_version: 3 }, error: null });
      }
      // UPDATE
      return createChainMock({ data: { id: 5, body: "旧版テキスト", current_version: 4 }, error: null });
    });

    const req = new NextRequest("http://localhost/api/admin/karte-template-versions", {
      method: "POST",
      body: JSON.stringify({ template_id: 5, version_id: 1 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
