// __tests__/api/doctor-karte-images.test.ts
// カルテ画像API (app/api/doctor/karte-images/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const {
  mockVerifyDoctorAuth,
  mockUpload,
  mockRemove,
  mockGetPublicUrl,
  mockListBuckets,
  mockCreateBucket,
} = vi.hoisted(() => ({
  mockVerifyDoctorAuth: vi.fn().mockResolvedValue(true),
  mockUpload: vi.fn().mockResolvedValue({ error: null }),
  mockRemove: vi.fn().mockResolvedValue({ error: null }),
  mockGetPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/storage/v1/object/public/karte-images/p1/test.jpg" } }),
  mockListBuckets: vi.fn().mockResolvedValue({ data: [{ name: "karte-images" }] }),
  mockCreateBucket: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    storage: {
      listBuckets: mockListBuckets,
      createBucket: mockCreateBucket,
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyDoctorAuth: mockVerifyDoctorAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

import { GET, POST, DELETE } from "@/app/api/doctor/karte-images/route";

function createGetReq(params: string) {
  return new Request(`http://localhost/api/doctor/karte-images?${params}`, {
    method: "GET",
  }) as unknown as import("next/server").NextRequest;
}

function createDeleteReq(params: string) {
  return new Request(`http://localhost/api/doctor/karte-images?${params}`, {
    method: "DELETE",
  }) as unknown as import("next/server").NextRequest;
}

describe("GET /api/doctor/karte-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const res = await GET(createGetReq("patient_id=p1"));
    expect(res.status).toBe(401);
  });

  it("patient_idもreserve_idもない場合は 400 を返す", async () => {
    const res = await GET(createGetReq(""));
    expect(res.status).toBe(400);
  });

  it("正常に画像一覧を返す", async () => {
    tableChains["karte_images"] = createChain({
      data: [{ id: 1, patient_id: "p1", image_url: "https://example.com/img.jpg" }],
      error: null,
    });

    const res = await GET(createGetReq("patient_id=p1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.images).toHaveLength(1);
  });

  it("DBエラー時は 500 を返す", async () => {
    tableChains["karte_images"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createGetReq("patient_id=p1"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/doctor/karte-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const formData = new FormData();
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ファイルなしの場合は 400 を返す", async () => {
    const formData = new FormData();
    formData.append("patient_id", "p1");
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("patient_idなしの場合は 400 を返す", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なファイルタイプは 400 を返す", async () => {
    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", "p1");
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("正常にアップロードして 200 を返す", async () => {
    mockUpload.mockResolvedValue({ error: null });

    // DB挿入成功
    tableChains["karte_images"] = createChain({
      data: { id: 1, patient_id: "p1", image_url: "https://example.com/img.jpg" },
      error: null,
    });

    const file = new File(["dummy-image-data"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", "p1");
    formData.append("reserve_id", "r1");
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.image).toBeDefined();
  });

  it("アップロードエラー時は 500 を返す", async () => {
    mockUpload.mockResolvedValue({ error: { message: "upload failed" } });

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", "p1");
    const req = new Request("http://localhost/api/doctor/karte-images", {
      method: "POST",
      body: formData,
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/doctor/karte-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyDoctorAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyDoctorAuth.mockResolvedValue(false);
    const res = await DELETE(createDeleteReq("id=1"));
    expect(res.status).toBe(401);
  });

  it("IDなしの場合は 400 を返す", async () => {
    const res = await DELETE(createDeleteReq(""));
    expect(res.status).toBe(400);
  });

  it("正常に削除して 200 を返す", async () => {
    // 画像取得
    tableChains["karte_images"] = createChain({
      data: { image_url: "https://test.supabase.co/storage/v1/object/public/karte-images/p1/test.jpg" },
      error: null,
    });

    const res = await DELETE(createDeleteReq("id=1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DB削除エラー時は 500 を返す", async () => {
    // 画像取得は成功
    const chain = createChain({ data: null, error: null });
    tableChains["karte_images"] = chain;
    // 2回目の呼び出し（delete）でエラー
    let callCount = 0;
    chain.then = vi.fn((resolve: (val: unknown) => unknown) => {
      callCount++;
      if (callCount <= 1) return resolve({ data: null, error: null });
      return resolve({ data: null, error: { message: "delete failed" } });
    });

    const res = await DELETE(createDeleteReq("id=1"));
    expect(res.status).toBe(500);
  });
});
