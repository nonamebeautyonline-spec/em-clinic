// lib/__tests__/salon-reservation-handler.test.ts
// サロン予約ハンドラのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- フロー状態管理モック ---
const mockGetFlowState = vi.fn();
const mockSetFlowState = vi.fn();
const mockClearFlowState = vi.fn();

vi.mock("@/lib/salon-reservation-flow", () => ({
  getFlowState: (...args: unknown[]) => mockGetFlowState(...args),
  setFlowState: (...args: unknown[]) => mockSetFlowState(...args),
  clearFlowState: (...args: unknown[]) => mockClearFlowState(...args),
}));

// --- メッセージビルダーモック ---
const mockBuildMenuSelectMessage = vi.fn().mockResolvedValue({ type: "flex", altText: "メニュー選択", contents: {} });
const mockBuildStylistSelectMessage = vi.fn().mockResolvedValue({ type: "flex", altText: "スタイリスト選択", contents: {} });
const mockBuildDateSelectMessage = vi.fn().mockReturnValue({ type: "flex", altText: "日付選択", contents: {} });
const mockBuildTimeSelectMessage = vi.fn().mockResolvedValue({ type: "flex", altText: "時間選択", contents: {} });
const mockBuildConfirmMessage = vi.fn().mockReturnValue({ type: "flex", altText: "確認", contents: {} });
const mockBuildCompletedMessage = vi.fn().mockReturnValue({ type: "text", text: "予約完了" });
const mockBuildCancelledMessage = vi.fn().mockReturnValue({ type: "text", text: "キャンセルしました" });

vi.mock("@/lib/salon-reservation-messages", () => ({
  buildMenuSelectMessage: (...args: unknown[]) => mockBuildMenuSelectMessage(...args),
  buildStylistSelectMessage: (...args: unknown[]) => mockBuildStylistSelectMessage(...args),
  buildDateSelectMessage: (...args: unknown[]) => mockBuildDateSelectMessage(...args),
  buildTimeSelectMessage: (...args: unknown[]) => mockBuildTimeSelectMessage(...args),
  buildConfirmMessage: (...args: unknown[]) => mockBuildConfirmMessage(...args),
  buildCompletedMessage: (...args: unknown[]) => mockBuildCompletedMessage(...args),
  buildCancelledMessage: (...args: unknown[]) => mockBuildCancelledMessage(...args),
}));

// --- Supabase モック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "eq", "maybeSingle", "single", "limit", "order"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  strictWithTenant: vi.fn(async (query: unknown) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id ?? "test-tenant" })),
}));

const {
  handleSalonReservationMessage,
  handleSalonReservationPostback,
} = await import("@/lib/salon-reservation-handler");

// ========================================================================

describe("handleSalonReservationMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFlowState.mockReturnValue(null);
  });

  // --- フロー開始 ---

  it("「予約」でSALONテナントの場合、メニュー選択メッセージを返す", async () => {
    // テナント業種判定: salon
    mockFrom.mockReturnValue(createMockChain({ industry: "salon" }));

    const result = await handleSalonReservationMessage("U001", "予約", "t1", "p1");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ type: "text", text: "ご予約を承ります。\n施術メニューをお選びください。" });
    expect(mockSetFlowState).toHaveBeenCalledWith("U001", expect.objectContaining({ step: "menu_select" }));
    expect(mockBuildMenuSelectMessage).toHaveBeenCalledWith("t1");
  });

  it("「予約する」でもフロー開始される", async () => {
    mockFrom.mockReturnValue(createMockChain({ industry: "salon" }));

    const result = await handleSalonReservationMessage("U001", "予約する", "t1", "p1");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(mockSetFlowState).toHaveBeenCalled();
  });

  it("SALONテナントではない場合、nullを返す", async () => {
    mockFrom.mockReturnValue(createMockChain({ industry: "clinic" }));

    const result = await handleSalonReservationMessage("U001", "予約", "t1", "p1");

    expect(result).toBeNull();
    expect(mockSetFlowState).not.toHaveBeenCalled();
  });

  it("フローがなく予約以外のメッセージの場合、nullを返す", async () => {
    const result = await handleSalonReservationMessage("U001", "こんにちは", "t1", "p1");

    expect(result).toBeNull();
  });

  // --- フロー進行中 ---

  it("フロー進行中に「キャンセル」でフローをクリアする", async () => {
    mockGetFlowState.mockReturnValue({ step: "stylist_select", tenantId: "t1", patientId: "p1", lineUid: "U001" });

    const result = await handleSalonReservationMessage("U001", "キャンセル", "t1", "p1");

    expect(result).toHaveLength(1);
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
    expect(mockBuildCancelledMessage).toHaveBeenCalled();
  });

  it("フロー進行中に「やめる」でもフローをクリアする", async () => {
    mockGetFlowState.mockReturnValue({ step: "menu_select", tenantId: "t1", patientId: "p1", lineUid: "U001" });

    const result = await handleSalonReservationMessage("U001", "やめる", "t1", "p1");

    expect(result).toHaveLength(1);
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
  });

  it("フロー進行中に「中止」でもフローをクリアする", async () => {
    mockGetFlowState.mockReturnValue({ step: "menu_select", tenantId: "t1", patientId: "p1", lineUid: "U001" });

    const result = await handleSalonReservationMessage("U001", "中止", "t1", "p1");

    expect(result).toHaveLength(1);
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
  });

  it("フロー進行中にテキストメッセージを送ると案内メッセージを返す", async () => {
    mockGetFlowState.mockReturnValue({ step: "stylist_select", tenantId: "t1", patientId: "p1", lineUid: "U001" });

    const result = await handleSalonReservationMessage("U001", "何かテキスト", "t1", "p1");

    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: "text",
      text: "予約フローの途中です。\n上のボタンから選択してください。\n中止する場合は「キャンセル」と送信してください。",
    });
  });
});

// ========================================================================

describe("handleSalonReservationPostback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFlowState.mockReturnValue(null);
  });

  // --- 対象外判定 ---

  it("salon_reserveアクションでないPostbackはnullを返す", async () => {
    const result = await handleSalonReservationPostback("U001", "action=other&step=menu", "t1", "p1");
    expect(result).toBeNull();
  });

  // --- フローなし（TTL切れ） ---

  it("フローなしでstep=menu以外の場合、期限切れメッセージを返す", async () => {
    const result = await handleSalonReservationPostback("U001", "action=salon_reserve&step=stylist&stylist_id=s1", "t1", "p1");

    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({
      type: "text",
      text: "予約フローの有効期限が切れました。\n「予約」と送信して最初からやり直してください。",
    });
  });

  // --- step=menu ---

  it("step=menu: メニュー選択でスタイリスト選択に進む", async () => {
    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=menu&menu_id=m1&menu_name=%E3%82%AB%E3%83%83%E3%83%88&duration=60&price=5000",
      "t1",
      "p1",
    );

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].type).toBe("text");
    expect((result![0] as any).text).toContain("カット");
    expect(mockSetFlowState).toHaveBeenCalledWith("U001", expect.objectContaining({
      step: "stylist_select",
      selectedMenuId: "m1",
      selectedMenuName: "カット",
      selectedMenuDuration: 60,
      selectedMenuPrice: 5000,
    }));
    expect(mockBuildStylistSelectMessage).toHaveBeenCalledWith("t1");
  });

  // --- step=stylist ---

  it("step=stylist: スタイリスト選択で日付選択に進む", async () => {
    const flow = {
      step: "stylist_select" as const,
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedMenuId: "m1",
      selectedMenuName: "カット",
      selectedMenuDuration: 60,
      selectedMenuPrice: 5000,
    };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=stylist&stylist_id=st1&stylist_name=%E7%94%B0%E4%B8%AD",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(2);
    expect((result![0] as any).text).toContain("田中");
    expect(mockSetFlowState).toHaveBeenCalledWith("U001", expect.objectContaining({
      step: "date_select",
      selectedStylistId: "st1",
      selectedStylistName: "田中",
    }));
    expect(mockBuildDateSelectMessage).toHaveBeenCalled();
  });

  it("step=stylist: フローなしの場合nullを返す", async () => {
    mockGetFlowState.mockReturnValue(null);

    // step=menuではないのでTTL切れメッセージが返る
    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=stylist&stylist_id=st1",
      "t1",
      "p1",
    );
    expect(result).toHaveLength(1);
    expect((result![0] as any).text).toContain("有効期限が切れました");
  });

  // --- step=date ---

  it("step=date: 日付選択で時間選択に進む", async () => {
    const flow = {
      step: "date_select" as const,
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedMenuId: "m1",
      selectedMenuDuration: 60,
      selectedStylistId: "st1",
    };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=date&date=2026-04-20",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect(mockSetFlowState).toHaveBeenCalledWith("U001", expect.objectContaining({
      step: "time_select",
      selectedDate: "2026-04-20",
    }));
    expect(mockBuildTimeSelectMessage).toHaveBeenCalledWith("t1", "st1", "2026-04-20", 60);
  });

  // --- step=time ---

  it("step=time: 時間選択で確認に進む", async () => {
    const flow = {
      step: "time_select" as const,
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedDate: "2026-04-20",
    };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=time&time=14:00",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect(mockSetFlowState).toHaveBeenCalledWith("U001", expect.objectContaining({
      step: "confirm",
      selectedTime: "14:00",
    }));
    expect(mockBuildConfirmMessage).toHaveBeenCalled();
  });

  // --- step=confirm ---

  it("step=confirm&confirm=no: キャンセルメッセージを返す", async () => {
    const flow = { step: "confirm" as const, tenantId: "t1", patientId: "p1", lineUid: "U001" };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=confirm&confirm=no",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
    expect(mockBuildCancelledMessage).toHaveBeenCalled();
  });

  it("step=confirm&confirm=yes: 予約確定成功で完了メッセージを返す", async () => {
    const flow = {
      step: "confirm" as const,
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
      selectedDate: "2026-04-20",
      selectedTime: "14:00",
      selectedMenuId: "m1",
      selectedMenuName: "カット",
    };
    mockGetFlowState.mockReturnValue(flow);

    // createSalonReservation内: 患者取得 → INSERT成功
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 患者名取得
        return createMockChain({ name: "田中太郎", line_display_name: "田中" });
      }
      // reservations INSERT
      return createMockChain(null, null);
    });

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=confirm&confirm=yes",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
    expect(mockBuildCompletedMessage).toHaveBeenCalled();
  });

  it("step=confirm&confirm=yes: INSERT失敗でエラーメッセージを返す", async () => {
    const flow = {
      step: "confirm" as const,
      tenantId: "t1",
      patientId: "p1",
      lineUid: "U001",
    };
    mockGetFlowState.mockReturnValue(flow);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createMockChain({ name: "田中" });
      }
      return createMockChain(null, { message: "insert failed" });
    });

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=confirm&confirm=yes",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect((result![0] as any).text).toContain("予約の確定に失敗しました");
    expect(mockClearFlowState).toHaveBeenCalled();
  });

  // --- defaultケース ---

  it("不明なstepの場合nullを返す", async () => {
    const flow = { step: "confirm" as const, tenantId: "t1", patientId: "p1", lineUid: "U001" };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=unknown",
      "t1",
      "p1",
    );

    expect(result).toBeNull();
  });

  // --- エラー処理 ---

  it("例外発生時はエラーメッセージを返しフローをクリアする", async () => {
    const flow = { step: "menu_select" as const, tenantId: "t1", patientId: "p1", lineUid: "U001" };
    mockGetFlowState.mockReturnValue(flow);

    // step=menuでbuildStylistSelectMessageが例外を投げるケース
    mockBuildStylistSelectMessage.mockRejectedValueOnce(new Error("DB error"));

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=menu&menu_id=m1&menu_name=test&duration=60&price=0",
      "t1",
      "p1",
    );

    expect(result).toHaveLength(1);
    expect((result![0] as any).text).toContain("エラーが発生しました");
    expect(mockClearFlowState).toHaveBeenCalledWith("U001");
  });

  // --- step=confirm, confirm が yes/no 以外 ---

  it("step=confirm&confirm=unknown: nullを返す", async () => {
    const flow = { step: "confirm" as const, tenantId: "t1", patientId: "p1", lineUid: "U001" };
    mockGetFlowState.mockReturnValue(flow);

    const result = await handleSalonReservationPostback(
      "U001",
      "action=salon_reserve&step=confirm&confirm=maybe",
      "t1",
      "p1",
    );

    expect(result).toBeNull();
  });
});
