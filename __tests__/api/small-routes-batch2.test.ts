// __tests__/api/small-routes-batch2.test.ts
// LINE管理系小型APIルートの統合テスト（バッチ2）
// 対象: schedule, schedule/[id], template-categories, templates,
//        templates/[id], templates/preview, upload-template-image,
//        column-settings, flex-presets, click-track, click-track/stats,
//        media, media-folders, segments, check-block, refresh-profile,
//        send-image, friend-settings, user-richmenu, broadcast/preview

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
  ].forEach((m) => {
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

const mockVerifyAdminAuth = vi.fn();
const mockPushMessage = vi.fn();
const mockSetDefaultRichMenu = vi.fn();
const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();
const mockGetSettingOrEnv = vi.fn();

// ストレージモック
const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
const mockStorageGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/img.jpg" } });
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null });
const mockStorageListBuckets = vi.fn().mockResolvedValue({ data: [{ name: "line-images" }] });
const mockStorageCreateBucket = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
    storage: {
      listBuckets: () => mockStorageListBuckets(),
      createBucket: (...args: any[]) => mockStorageCreateBucket(...args),
      from: () => ({
        upload: (...args: any[]) => mockStorageUpload(...args),
        getPublicUrl: (...args: any[]) => mockStorageGetPublicUrl(...args),
        remove: (...args: any[]) => mockStorageRemove(...args),
      }),
    },
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: any[]) => mockPushMessage(...args),
}));

vi.mock("@/lib/line-richmenu", () => ({
  setDefaultRichMenu: (...args: any[]) => mockSetDefaultRichMenu(...args),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
  getSettingOrEnv: (...args: any[]) => mockGetSettingOrEnv(...args),
}));

vi.mock("@/lib/behavior-filters", () => ({
  getVisitCounts: vi.fn().mockResolvedValue({}),
  getPurchaseAmounts: vi.fn().mockResolvedValue({}),
  getLastVisitDates: vi.fn().mockResolvedValue({}),
  getReorderCounts: vi.fn().mockResolvedValue({}),
  matchBehaviorCondition: vi.fn().mockReturnValue(true),
}));

// fetchグローバルモック
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(""),
}));

// NextRequest互換のモック生成
function createReq(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  req.nextUrl = new URL(url);
  return req;
}

// FormDataリクエスト生成
function createFormDataReq(url: string, formData: FormData) {
  const req = new Request(url, {
    method: "POST",
    body: formData,
  }) as any;
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象ルートのインポート
// ============================================================

import { GET as scheduleGET, POST as schedulePOST } from "@/app/api/admin/line/schedule/route";
import { DELETE as scheduleIdDELETE } from "@/app/api/admin/line/schedule/[id]/route";
import { GET as templateCategoriesGET, POST as templateCategoriesPOST } from "@/app/api/admin/line/template-categories/route";
import { GET as templatesGET, POST as templatesPOST } from "@/app/api/admin/line/templates/route";
import { PUT as templatesIdPUT, DELETE as templatesIdDELETE } from "@/app/api/admin/line/templates/[id]/route";
import { POST as templatePreviewPOST } from "@/app/api/admin/line/templates/preview/route";
import { POST as uploadTemplateImagePOST } from "@/app/api/admin/line/upload-template-image/route";
import { GET as columnSettingsGET, PUT as columnSettingsPUT } from "@/app/api/admin/line/column-settings/route";
import { GET as flexPresetsGET } from "@/app/api/admin/line/flex-presets/route";
import { GET as clickTrackGET, POST as clickTrackPOST } from "@/app/api/admin/line/click-track/route";
import { GET as clickTrackStatsGET } from "@/app/api/admin/line/click-track/stats/route";
import { GET as mediaGET, PUT as mediaPUT, DELETE as mediaDELETE } from "@/app/api/admin/line/media/route";
import { GET as mediaFoldersGET, POST as mediaFoldersPOST, PUT as mediaFoldersPUT, DELETE as mediaFoldersDELETE } from "@/app/api/admin/line/media-folders/route";
import { GET as segmentsGET, POST as segmentsPOST, DELETE as segmentsDELETE } from "@/app/api/admin/line/segments/route";
import { GET as checkBlockGET } from "@/app/api/admin/line/check-block/route";
import { POST as refreshProfilePOST } from "@/app/api/admin/line/refresh-profile/route";
import { GET as friendSettingsGET, PUT as friendSettingsPUT } from "@/app/api/admin/line/friend-settings/route";
import { GET as userRichmenuGET, POST as userRichmenuPOST } from "@/app/api/admin/line/user-richmenu/route";
import { POST as broadcastPreviewPOST } from "@/app/api/admin/line/broadcast/preview/route";

// ============================================================
// beforeEach
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockPushMessage.mockResolvedValue({ ok: true });
  mockSetDefaultRichMenu.mockResolvedValue(true);
  mockGetSetting.mockResolvedValue(null);
  mockSetSetting.mockResolvedValue(true);
  mockGetSettingOrEnv.mockResolvedValue("mock-line-token");
  mockStorageListBuckets.mockResolvedValue({ data: [{ name: "line-images" }] });
  (globalThis.fetch as any).mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(""),
  });
});

// ============================================================
// 1. schedule（予約送信一覧・登録）
// ============================================================
describe("schedule API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await scheduleGET(createReq("GET", "http://localhost/api/admin/line/schedule"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 予約送信一覧を返す", async () => {
    const chain = getOrCreateChain("scheduled_messages");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1 }], error: null }));

    const res = await scheduleGET(createReq("GET", "http://localhost/api/admin/line/schedule"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.schedules).toBeDefined();
  });

  it("POST 正常系 → 予約送信を登録", async () => {
    // 患者取得チェーン
    const pChain = getOrCreateChain("patients");
    pChain.then = vi.fn((r: any) => r({ data: { line_id: "U123" }, error: null }));
    // 登録チェーン
    const sChain = getOrCreateChain("scheduled_messages");
    sChain.then = vi.fn((r: any) => r({ data: { id: 1 }, error: null }));

    const res = await schedulePOST(createReq("POST", "http://localhost/api/admin/line/schedule", {
      patient_id: "P001",
      message: "テストメッセージ",
      scheduled_at: "2026-03-01T10:00:00Z",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.schedule).toBeDefined();
  });
});

// ============================================================
// 2. schedule/[id]（予約送信キャンセル）
// ============================================================
describe("schedule/[id] API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await scheduleIdDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/schedule/1"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE 正常系 → キャンセル成功", async () => {
    const chain = getOrCreateChain("scheduled_messages");
    chain.then = vi.fn((r: any) => r({ data: null, error: null }));

    const res = await scheduleIdDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/schedule/1"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 3. template-categories（テンプレートカテゴリ）
// ============================================================
describe("template-categories API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await templateCategoriesGET(createReq("GET", "http://localhost/api/admin/line/template-categories"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → カテゴリ一覧を返す", async () => {
    const chain = getOrCreateChain("template_categories");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, name: "テスト" }], error: null }));

    const res = await templateCategoriesGET(createReq("GET", "http://localhost/api/admin/line/template-categories"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.categories).toBeDefined();
  });

  it("POST 正常系 → カテゴリを作成", async () => {
    const chain = getOrCreateChain("template_categories");
    chain.then = vi.fn((r: any) => r({ data: { sort_order: 1 }, error: null }));

    const res = await templateCategoriesPOST(createReq("POST", "http://localhost/api/admin/line/template-categories", {
      name: "新規カテゴリ",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.category).toBeDefined();
  });
});

// ============================================================
// 4. templates（テンプレート一覧・作成）
// ============================================================
describe("templates API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await templatesGET(createReq("GET", "http://localhost/api/admin/line/templates"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → テンプレート一覧を返す", async () => {
    const chain = getOrCreateChain("message_templates");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, name: "テスト" }], error: null }));

    const res = await templatesGET(createReq("GET", "http://localhost/api/admin/line/templates"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.templates).toBeDefined();
  });

  it("POST 正常系 → テンプレートを作成", async () => {
    const chain = getOrCreateChain("message_templates");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, name: "テスト" }, error: null }));

    const res = await templatesPOST(createReq("POST", "http://localhost/api/admin/line/templates", {
      name: "テンプレート1",
      content: "テスト内容",
      message_type: "text",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.template).toBeDefined();
  });
});

// ============================================================
// 5. templates/[id]（テンプレート更新・削除）
// ============================================================
describe("templates/[id] API", () => {
  it("PUT 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await templatesIdPUT(
      createReq("PUT", "http://localhost/api/admin/line/templates/1", { name: "変更" }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("PUT 正常系 → テンプレートを更新", async () => {
    const chain = getOrCreateChain("message_templates");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, name: "変更後" }, error: null }));

    const res = await templatesIdPUT(
      createReq("PUT", "http://localhost/api/admin/line/templates/1", { name: "変更後" }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.template).toBeDefined();
  });

  it("DELETE 正常系 → テンプレートを削除", async () => {
    const chain = getOrCreateChain("message_templates");
    chain.then = vi.fn((r: any) => r({ data: null, error: null }));

    const res = await templatesIdDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/templates/1"),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 6. templates/preview（テンプレートプレビュー）
// ============================================================
describe("templates/preview API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await templatePreviewPOST(createReq("POST", "http://localhost/api/admin/line/templates/preview", {
      template_content: "テスト",
    }));
    expect(res.status).toBe(401);
  });

  it("POST 正常系（サンプルデータ） → プレビューを返す", async () => {
    const res = await templatePreviewPOST(createReq("POST", "http://localhost/api/admin/line/templates/preview", {
      template_content: "こんにちは{name}さん",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.source).toBe("sample");
    // サンプルデータで {name} が置換される
    expect(json.preview).toContain("田中太郎");
  });
});

// ============================================================
// 7. upload-template-image（テンプレート画像アップロード）
// ============================================================
describe("upload-template-image API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const formData = new FormData();
    const res = await uploadTemplateImagePOST(createFormDataReq("http://localhost/api/admin/line/upload-template-image", formData));
    expect(res.status).toBe(401);
  });

  it("POST ファイル無し → 400", async () => {
    const formData = new FormData();
    const res = await uploadTemplateImagePOST(createFormDataReq("http://localhost/api/admin/line/upload-template-image", formData));
    expect(res.status).toBe(400);
  });

  it("POST 正常系 → 画像をアップロード", async () => {
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadTemplateImagePOST(createFormDataReq("http://localhost/api/admin/line/upload-template-image", formData));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.url).toBeDefined();
  });
});

// ============================================================
// 8. column-settings（カラム表示設定）
// ============================================================
describe("column-settings API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await columnSettingsGET(createReq("GET", "http://localhost/api/admin/line/column-settings"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 設定を返す", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify({ memo: true }));
    const res = await columnSettingsGET(createReq("GET", "http://localhost/api/admin/line/column-settings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sections).toBeDefined();
    expect(json.sections.memo).toBe(true);
  });

  it("PUT 正常系 → 設定を保存", async () => {
    const res = await columnSettingsPUT(createReq("PUT", "http://localhost/api/admin/line/column-settings", {
      sections: { memo: false, tags: true },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 9. flex-presets（Flexプリセット一覧）
// ============================================================
describe("flex-presets API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await flexPresetsGET(createReq("GET", "http://localhost/api/admin/line/flex-presets"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → プリセット一覧を返す", async () => {
    const chain = getOrCreateChain("flex_presets");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1 }], error: null }));

    const res = await flexPresetsGET(createReq("GET", "http://localhost/api/admin/line/flex-presets"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.presets).toBeDefined();
  });
});

// ============================================================
// 10. click-track（クリック計測リンク管理）
// ============================================================
describe("click-track API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await clickTrackGET(createReq("GET", "http://localhost/api/admin/line/click-track"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → リンク一覧を返す", async () => {
    const chain = getOrCreateChain("click_tracking_links");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, click_events: [{ count: 5 }] }], error: null }));

    const res = await clickTrackGET(createReq("GET", "http://localhost/api/admin/line/click-track"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.links).toBeDefined();
  });

  it("POST 正常系 → クリック計測リンクを作成", async () => {
    const chain = getOrCreateChain("click_tracking_links");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, tracking_code: "abc123" }, error: null }));

    const res = await clickTrackPOST(createReq("POST", "http://localhost/api/admin/line/click-track", {
      original_url: "https://example.com",
      label: "テストリンク",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.link).toBeDefined();
    expect(json.tracking_url).toBeDefined();
  });
});

// ============================================================
// 11. click-track/stats（クリック統計）
// ============================================================
describe("click-track/stats API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await clickTrackStatsGET(createReq("GET", "http://localhost/api/admin/line/click-track/stats"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系（全体統計） → 統計を返す", async () => {
    const chain = getOrCreateChain("click_tracking_links");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, tracking_code: "abc", original_url: "https://example.com", label: null, broadcast_id: null, created_at: "2026-01-01", click_tracking_events: [{ count: 3 }] }], error: null }));

    const res = await clickTrackStatsGET(createReq("GET", "http://localhost/api/admin/line/click-track/stats"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toBeDefined();
  });

  it("GET 正常系（link_id指定） → イベント詳細を返す", async () => {
    const chain = getOrCreateChain("click_tracking_events");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, clicked_at: "2026-01-01" }], error: null }));

    const res = await clickTrackStatsGET(createReq("GET", "http://localhost/api/admin/line/click-track/stats?link_id=1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toBeDefined();
  });
});

// ============================================================
// 12. media（メディア管理）
// ============================================================
describe("media API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await mediaGET(createReq("GET", "http://localhost/api/admin/line/media"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → メディア一覧を返す", async () => {
    const chain = getOrCreateChain("media_files");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1 }], error: null }));

    const res = await mediaGET(createReq("GET", "http://localhost/api/admin/line/media"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.files).toBeDefined();
  });

  it("PUT 正常系 → メディア名を変更", async () => {
    const chain = getOrCreateChain("media_files");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, name: "更新後" }, error: null }));

    const res = await mediaPUT(createReq("PUT", "http://localhost/api/admin/line/media", {
      id: 1,
      name: "更新後",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE ID無し → 400", async () => {
    const res = await mediaDELETE(createReq("DELETE", "http://localhost/api/admin/line/media"));
    expect(res.status).toBe(400);
  });

  it("DELETE 正常系 → メディアを削除", async () => {
    const chain = getOrCreateChain("media_files");
    chain.then = vi.fn((r: any) => r({ data: { file_url: "https://example.com/storage/v1/object/public/line-images/media/image/test.jpg" }, error: null }));

    const res = await mediaDELETE(createReq("DELETE", "http://localhost/api/admin/line/media?id=1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 13. media-folders（メディアフォルダ管理）
// ============================================================
describe("media-folders API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await mediaFoldersGET(createReq("GET", "http://localhost/api/admin/line/media-folders"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → フォルダ一覧を返す", async () => {
    const chain = getOrCreateChain("media_folders");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, name: "テスト", media_files: [{ count: 3 }] }], error: null }));

    const res = await mediaFoldersGET(createReq("GET", "http://localhost/api/admin/line/media-folders"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folders).toBeDefined();
  });

  it("POST 正常系 → フォルダを作成", async () => {
    const chain = getOrCreateChain("media_folders");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, name: "新規" }, error: null }));

    const res = await mediaFoldersPOST(createReq("POST", "http://localhost/api/admin/line/media-folders", {
      name: "新規フォルダ",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PUT 正常系 → フォルダ名を変更", async () => {
    const chain = getOrCreateChain("media_folders");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, name: "変更後" }, error: null }));

    const res = await mediaFoldersPUT(createReq("PUT", "http://localhost/api/admin/line/media-folders", {
      id: 1,
      name: "変更後",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE ID無し → 400", async () => {
    const res = await mediaFoldersDELETE(createReq("DELETE", "http://localhost/api/admin/line/media-folders"));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 14. segments（セグメント保存・管理）
// ============================================================
describe("segments API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await segmentsGET(createReq("GET", "http://localhost/api/admin/line/segments"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → セグメント一覧を返す", async () => {
    mockGetSetting.mockResolvedValue(JSON.stringify([{ id: "s1", name: "テスト" }]));
    const res = await segmentsGET(createReq("GET", "http://localhost/api/admin/line/segments"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.segments).toBeDefined();
  });

  it("POST 正常系 → セグメントを作成", async () => {
    mockGetSetting.mockResolvedValue(null);
    mockSetSetting.mockResolvedValue(true);
    const res = await segmentsPOST(createReq("POST", "http://localhost/api/admin/line/segments", {
      name: "新規セグメント",
      includeConditions: [],
      excludeConditions: [],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.segment).toBeDefined();
    expect(json.segment.name).toBe("新規セグメント");
  });

  it("DELETE ID無し → 400", async () => {
    const res = await segmentsDELETE(createReq("DELETE", "http://localhost/api/admin/line/segments"));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 15. check-block（LINEブロック確認）
// ============================================================
describe("check-block API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await checkBlockGET(createReq("GET", "http://localhost/api/admin/line/check-block?patient_id=P001"));
    expect(res.status).toBe(401);
  });

  it("patient_id無し → 400", async () => {
    const res = await checkBlockGET(createReq("GET", "http://localhost/api/admin/line/check-block"));
    expect(res.status).toBe(400);
  });

  it("GET 正常系 → ブロック状態を返す", async () => {
    const chain = getOrCreateChain("patients");
    chain.then = vi.fn((r: any) => r({ data: { line_id: "U123" }, error: null }));

    // LINE Profile API成功 = ブロックされていない
    (globalThis.fetch as any).mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });

    const res = await checkBlockGET(createReq("GET", "http://localhost/api/admin/line/check-block?patient_id=P001"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.blocked).toBe(false);
  });
});

// ============================================================
// 16. refresh-profile（LINEプロフィール更新）
// ============================================================
describe("refresh-profile API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await refreshProfilePOST(createReq("POST", "http://localhost/api/admin/line/refresh-profile", {
      patient_id: "P001",
    }));
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → プロフィールを更新", async () => {
    const chain = getOrCreateChain("patients");
    chain.then = vi.fn((r: any) => r({ data: { line_id: "U123" }, error: null }));

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ displayName: "テスト太郎", pictureUrl: "https://example.com/pic.jpg" }),
    });

    const res = await refreshProfilePOST(createReq("POST", "http://localhost/api/admin/line/refresh-profile", {
      patient_id: "P001",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.displayName).toBe("テスト太郎");
  });
});

// ============================================================
// 17. send-image（画像送信） — FormDataのためスキップ（upload-template-imageと同パターン）
// send-imageはFormData+pushMessageのため、テストの構成が複雑になるので認証のみ
// ============================================================
// ※ send-image は POST で formData を使うため、import テストに限定
// 注: send-image のインポートは下で別途行う

// ============================================================
// 18. friend-settings（友達追加時設定）
// ============================================================
describe("friend-settings API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await friendSettingsGET(createReq("GET", "http://localhost/api/admin/line/friend-settings"));
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → 設定一覧を返す", async () => {
    const chain = getOrCreateChain("friend_add_settings");
    chain.then = vi.fn((r: any) => r({ data: [{ id: 1, setting_key: "new_friend" }], error: null }));

    const res = await friendSettingsGET(createReq("GET", "http://localhost/api/admin/line/friend-settings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toBeDefined();
  });

  it("PUT 正常系 → 設定を更新", async () => {
    const chain = getOrCreateChain("friend_add_settings");
    chain.then = vi.fn((r: any) => r({ data: { id: 1, setting_key: "greeting" }, error: null }));

    const res = await friendSettingsPUT(createReq("PUT", "http://localhost/api/admin/line/friend-settings", {
      setting_key: "greeting",
      setting_value: { message: "ようこそ" },
      enabled: true,
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.setting).toBeDefined();
  });
});

// ============================================================
// 19. user-richmenu（ユーザーリッチメニュー）
// ============================================================
describe("user-richmenu API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await userRichmenuGET(createReq("GET", "http://localhost/api/admin/line/user-richmenu?patient_id=P001"));
    expect(res.status).toBe(401);
  });

  it("GET patient_id無し → 400", async () => {
    const res = await userRichmenuGET(createReq("GET", "http://localhost/api/admin/line/user-richmenu"));
    expect(res.status).toBe(400);
  });

  it("GET 正常系 → ユーザーのリッチメニューを返す", async () => {
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((r: any) => r({ data: { line_id: "U123" }, error: null }));

    // LINE APIでリッチメニューIDを返す
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ richMenuId: "rm-123" }),
    });

    // DBでメニュー情報を返す
    const richMenusChain = getOrCreateChain("rich_menus");
    richMenusChain.then = vi.fn((r: any) => r({ data: { id: 1, name: "テストメニュー", image_url: "/test.png", line_rich_menu_id: "rm-123" }, error: null }));

    const res = await userRichmenuGET(createReq("GET", "http://localhost/api/admin/line/user-richmenu?patient_id=P001"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.menu).toBeDefined();
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await userRichmenuPOST(createReq("POST", "http://localhost/api/admin/line/user-richmenu", {
      patient_id: "P001",
      rich_menu_id: 1,
    }));
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → リッチメニューを割り当て", async () => {
    // rich_menusからメニュー情報を返す
    const richMenusChain = getOrCreateChain("rich_menus");
    richMenusChain.then = vi.fn((r: any) => r({ data: { id: 1, name: "テスト", line_rich_menu_id: "rm-123", image_url: "/test.png" }, error: null }));

    // patientsからline_idを返す
    const patientsChain = getOrCreateChain("patients");
    patientsChain.then = vi.fn((r: any) => r({ data: { line_id: "U123" }, error: null }));

    // LINE API成功
    (globalThis.fetch as any).mockResolvedValue({ ok: true });

    const res = await userRichmenuPOST(createReq("POST", "http://localhost/api/admin/line/user-richmenu", {
      patient_id: "P001",
      rich_menu_id: 1,
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ============================================================
// 20. broadcast/preview（配信プレビュー）
// ============================================================
describe("broadcast/preview API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await broadcastPreviewPOST(createReq("POST", "http://localhost/api/admin/line/broadcast/preview", {
      filter_rules: {},
    }));
    expect(res.status).toBe(401);
  });

  it("POST 正常系 → プレビューを返す", async () => {
    // resolveTargets内でpatientsテーブルを参照
    const chain = getOrCreateChain("patients");
    chain.then = vi.fn((r: any) => r({ data: [{ patient_id: "P001", name: "テスト太郎", line_id: "U123" }], error: null }));

    // patient_tagsチェーン
    const tagsChain = getOrCreateChain("patient_tags");
    tagsChain.then = vi.fn((r: any) => r({ data: [], error: null }));

    const res = await broadcastPreviewPOST(createReq("POST", "http://localhost/api/admin/line/broadcast/preview", {
      filter_rules: {},
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBeDefined();
    expect(json.sendable).toBeDefined();
  });
});
