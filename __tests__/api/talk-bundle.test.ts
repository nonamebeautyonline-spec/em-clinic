// __tests__/api/talk-bundle.test.ts
// 患者トーク画面用バンドルAPI（admin/patients/[id]/talk-bundle）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== チェーンモック =====
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// ===== モック =====
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", tenantId: "test-tenant" }),
}));

vi.mock("@/lib/patient-utils", () => ({
  formatProductCode: vi.fn((code: string) => code || "-"),
  formatPaymentMethod: vi.fn((m: string) => m || "-"),
  formatReorderStatus: vi.fn((s: string) => s || "-"),
  formatDateJST: vi.fn((d: string) => d || "-"),
}));

import { GET } from "@/app/api/admin/patients/[id]/talk-bundle/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// テスト用ヘルパー
function makeReq() {
  return new NextRequest("http://localhost:3000/api/admin/patients/p001/talk-bundle", { method: "GET" });
}

function makeCtx(id = "p001") {
  return { params: Promise.resolve({ id }) };
}

// ===== テスト =====
describe("admin/patients/[id]/talk-bundle API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗で401を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(null as any);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("正常リクエストで200とバンドルデータを返す", async () => {
    // 各テーブルのデフォルトレスポンスを設定
    // message_log: メッセージ2件
    tableChains["message_log"] = createChain({
      data: [
        { id: 1, content: "こんにちは", status: "received", direction: "incoming", sent_at: "2026-01-01" },
        { id: 2, content: "返信", status: "sent", direction: "outgoing", sent_at: "2026-01-02" },
      ],
      error: null,
    });
    // patient_tags
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    // patient_marks
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    // friend_field_values
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    // patients（answerer）
    tableChains["patients"] = createChain({ data: { name: "田中太郎", name_kana: "タナカタロウ", sex: "male", birthday: "1990-01-01", line_id: "Uxxxx", tel: "09012345678" }, error: null });
    // orders
    tableChains["orders"] = createChain({ data: [], error: null });
    // reorders
    tableChains["reorders"] = createChain({ data: [], error: null });
    // reservations
    tableChains["reservations"] = createChain({ data: null, error: null });
    // intake
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();

    // 基本構造を確認
    expect(json).toHaveProperty("messages");
    expect(json).toHaveProperty("tags");
    expect(json).toHaveProperty("mark");
    expect(json).toHaveProperty("fields");
    expect(json).toHaveProperty("detail");
    expect(json.detail).toHaveProperty("found", true);
    expect(json.detail.patient.id).toBe("p001");
  });

  it("メッセージのdirection補正: status=received → incoming", async () => {
    tableChains["message_log"] = createChain({
      data: [{ id: 1, content: "test", status: "received", direction: "outgoing", sent_at: "2026-01-01" }],
      error: null,
    });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();

    // status=received なので direction は "incoming" に補正される
    expect(json.messages[0].direction).toBe("incoming");
  });

  it("メッセージのdirection補正: status=sent → outgoing", async () => {
    tableChains["message_log"] = createChain({
      data: [{ id: 1, content: "test", status: "sent", direction: "incoming", sent_at: "2026-01-01" }],
      error: null,
    });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();

    expect(json.messages[0].direction).toBe("outgoing");
  });

  it("25件のメッセージでhasMore=trueを返す", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      content: `msg${i}`,
      status: "received",
      direction: "incoming",
      sent_at: "2026-01-01",
    }));
    tableChains["message_log"] = createChain({ data: messages, error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.hasMore).toBe(true);
  });

  it("25件未満のメッセージでhasMore=falseを返す", async () => {
    tableChains["message_log"] = createChain({ data: [{ id: 1, content: "msg", status: "sent", sent_at: "2026-01-01" }], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.hasMore).toBe(false);
  });

  it("マークが未設定の場合デフォルト値を返す", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null }); // null = 未設定
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.mark.mark).toBe("none");
    expect(json.mark.patient_id).toBe("p001");
  });

  it("注文履歴がある場合latestOrderが返る", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { name: "テスト", name_kana: null, sex: null, birthday: null, line_id: null, tel: null }, error: null });
    tableChains["orders"] = createChain({
      data: [
        {
          id: "order-1",
          product_code: "MJL_2.5mg_1m",
          amount: 15000,
          payment_method: "card",
          shipping_date: "2026-01-15",
          tracking_number: "1234567890",
          created_at: "2026-01-10T00:00:00Z",
          postal_code: "100-0001",
          address: "東京都千代田区",
          phone: "09012345678",
          email: "test@example.com",
          refund_status: null,
        },
      ],
      error: null,
    });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.detail.latestOrder).not.toBeNull();
    expect(json.detail.latestOrder.tracking).toBe("1234567890");
  });

  it("問診データがある場合medicalInfoが返る", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: { name: "テスト", name_kana: "テスト", sex: "male", birthday: "1990-01-01", line_id: null, tel: null }, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({
      data: {
        answers: {
          current_disease_yesno: "no",
          glp_history: "使用歴なし",
          med_yesno: "no",
          allergy_yesno: "no",
        },
        created_at: "2026-01-01",
      },
      error: null,
    });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.detail.medicalInfo).not.toBeNull();
    expect(json.detail.medicalInfo.hasIntake).toBe(true);
    expect(json.detail.medicalInfo.medicalHistory).toBe("特記事項なし");
    expect(json.detail.medicalInfo.allergies).toBe("アレルギーなし");
  });

  it("予約がある場合nextReservationが返る", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    // 予約あり
    tableChains["reservations"] = createChain({
      data: { reserved_date: "2026-02-01", reserved_time: "10:00", status: null },
      error: null,
    });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.detail.nextReservation).toBe("2026-02-01 10:00");
  });

  it("診察済み予約は「（診察済み）」が付く", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({
      data: { reserved_date: "2026-02-01", reserved_time: "10:00", status: "OK" },
      error: null,
    });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.detail.nextReservation).toContain("（診察済み）");
  });

  it("NG予約は「（NG）」が付く", async () => {
    tableChains["message_log"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [], error: null });
    tableChains["reorders"] = createChain({ data: [], error: null });
    tableChains["reservations"] = createChain({
      data: { reserved_date: "2026-02-01", reserved_time: "10:00", status: "NG" },
      error: null,
    });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    const json = await res.json();
    expect(json.detail.nextReservation).toContain("（NG）");
  });

  it("全データが空でも正常に200を返す", async () => {
    tableChains["message_log"] = createChain({ data: null, error: null });
    tableChains["patient_tags"] = createChain({ data: null, error: null });
    tableChains["patient_marks"] = createChain({ data: null, error: null });
    tableChains["friend_field_values"] = createChain({ data: null, error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: null, error: null });
    tableChains["reorders"] = createChain({ data: null, error: null });
    tableChains["reservations"] = createChain({ data: null, error: null });
    tableChains["intake"] = createChain({ data: null, error: null });

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toEqual([]);
    expect(json.tags).toEqual([]);
    expect(json.detail.found).toBe(true);
    expect(json.detail.medicalInfo).toBeNull();
  });
});
