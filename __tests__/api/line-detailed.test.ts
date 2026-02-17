// __tests__/api/line-detailed.test.ts
// LINE詳細機能API統合テスト（45+ルート: サブルート含む全LINE管理機能）
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  const fullDir = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullDir)) return results;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(path.relative(process.cwd(), full)));
    } else if (entry.name === "route.ts") {
      results.push(path.relative(process.cwd(), full));
    }
  }
  return results;
}

const LINE_ALL_ROUTES = findRouteFiles("app/api/admin/line");

// ===================================================================
// 全LINE管理ルート共通チェック
// ===================================================================
describe("LINE管理全ルート: 認証チェック", () => {
  it("全 LINE ルートが verifyAdminAuth で認証している", () => {
    const violations: string[] = [];
    for (const route of LINE_ALL_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyAdminAuth")) {
        violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("LINE管理全ルート: テナント分離", () => {
  it("supabaseAdmin を使う LINE ルートはテナント対応している", () => {
    const violations: string[] = [];
    for (const route of LINE_ALL_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("LINE管理全ルート: 401レスポンス", () => {
  it("全 LINE ルートが認証失敗時 401 を返す", () => {
    const violations: string[] = [];
    for (const route of LINE_ALL_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("401")) violations.push(route);
    }
    expect(violations).toEqual([]);
  });
});

// ===================================================================
// 個別LINE詳細ルートテスト
// ===================================================================
const LINE_DETAIL_ROUTES = [
  { file: "app/api/admin/line/keyword-replies/route.ts", name: "キーワード応答" },
  { file: "app/api/admin/line/keyword-replies/test/route.ts", name: "キーワード応答テスト" },
  { file: "app/api/admin/line/segments/route.ts", name: "セグメント" },
  { file: "app/api/admin/line/click-track/route.ts", name: "クリックトラック" },
  { file: "app/api/admin/line/click-track/stats/route.ts", name: "クリック統計" },
  { file: "app/api/admin/line/actions/route.ts", name: "アクション" },
  { file: "app/api/admin/line/actions/execute/route.ts", name: "アクション実行" },
  { file: "app/api/admin/line/action-folders/route.ts", name: "アクションフォルダ" },
  { file: "app/api/admin/line/flex-presets/route.ts", name: "Flexプリセット" },
  { file: "app/api/admin/line/forms/[id]/route.ts", name: "フォーム詳細" },
  { file: "app/api/admin/line/forms/[id]/publish/route.ts", name: "フォーム公開" },
  { file: "app/api/admin/line/forms/[id]/responses/route.ts", name: "フォーム回答" },
  { file: "app/api/admin/line/form-folders/route.ts", name: "フォームフォルダ" },
  { file: "app/api/admin/line/marks/[id]/route.ts", name: "マーク詳細" },
  { file: "app/api/admin/line/rich-menus/[id]/route.ts", name: "リッチメニュー詳細" },
  { file: "app/api/admin/line/schedule/[id]/route.ts", name: "予約配信詳細" },
  { file: "app/api/admin/line/step-scenarios/[id]/route.ts", name: "ステップ配信詳細" },
  { file: "app/api/admin/line/step-scenarios/[id]/enrollments/route.ts", name: "ステップ登録者" },
  { file: "app/api/admin/line/templates/[id]/route.ts", name: "テンプレート詳細" },
  { file: "app/api/admin/line/template-categories/route.ts", name: "テンプレートカテゴリ" },
  { file: "app/api/admin/line/send-image/route.ts", name: "画像送信" },
  { file: "app/api/admin/line/upload-template-image/route.ts", name: "テンプレート画像アップロード" },
  { file: "app/api/admin/line/broadcast/preview/route.ts", name: "配信プレビュー" },
  { file: "app/api/admin/line/broadcast/ab-test/route.ts", name: "A/Bテスト" },
  { file: "app/api/admin/line/media/route.ts", name: "メディア管理" },
  { file: "app/api/admin/line/media-folders/route.ts", name: "メディアフォルダ" },
  { file: "app/api/admin/line/column-settings/route.ts", name: "カラム設定" },
  { file: "app/api/admin/line/friend-settings/route.ts", name: "友だち設定" },
  { file: "app/api/admin/line/friends-list/route.ts", name: "友だち一覧" },
  { file: "app/api/admin/line/menu-rules/route.ts", name: "メニュールール" },
  { file: "app/api/admin/line/followers/route.ts", name: "フォロワー" },
  { file: "app/api/admin/line/refresh-profile/route.ts", name: "プロフィール更新" },
  { file: "app/api/admin/line/check-block/route.ts", name: "ブロックチェック" },
  { file: "app/api/admin/line/user-richmenu/route.ts", name: "ユーザーリッチメニュー" },
  { file: "app/api/admin/line/richmenu-image/route.ts", name: "リッチメニュー画像" },
  { file: "app/api/admin/line/dashboard/route.ts", name: "ダッシュボード" },
  { file: "app/api/admin/line/reminder-rules/route.ts", name: "リマインダールール" },
  { file: "app/api/admin/line/coupons/route.ts", name: "クーポン" },
];

describe("LINE詳細ルート: 認証チェック", () => {
  for (const { file, name } of LINE_DETAIL_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

// テナント対応が設定ベース（getSetting/setSetting）で行われるルートは除外
const TENANT_EXEMPT_ROUTES = ["segments", "column-settings", "broadcast/preview"];

describe("LINE詳細ルート: テナント対応", () => {
  for (const { file, name } of LINE_DETAIL_ROUTES) {
    const isExempt = TENANT_EXEMPT_ROUTES.some((r) => file.includes(r));
    if (isExempt) continue;
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("LINE詳細ルート: HTTPメソッド", () => {
  for (const { file, name } of LINE_DETAIL_ROUTES) {
    it(`${name} は適切なHTTPメソッドがエクスポートされている`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasGet = /export\s+async\s+function\s+GET/.test(src);
      const hasPost = /export\s+async\s+function\s+POST/.test(src);
      const hasPut = /export\s+async\s+function\s+PUT/.test(src);
      const hasDelete = /export\s+async\s+function\s+DELETE/.test(src);
      const hasPatch = /export\s+async\s+function\s+PATCH/.test(src);
      expect(hasGet || hasPost || hasPut || hasDelete || hasPatch).toBe(true);
    });
  }
});

// ===================================================================
// キーワード応答 固有テスト
// ===================================================================
describe("keyword-replies: キーワード応答詳細", () => {
  const file = "app/api/admin/line/keyword-replies/route.ts";

  it("keyword_auto_replies テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("keyword_auto_replies");
  });

  it("GET/POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});

// ===================================================================
// セグメント 固有テスト
// ===================================================================
describe("segments: セグメント管理詳細", () => {
  const file = "app/api/admin/line/segments/route.ts";

  it("segments テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("segments");
  });
});

// ===================================================================
// クリックトラック 固有テスト
// ===================================================================
describe("click-track: クリックトラック詳細", () => {
  const file = "app/api/admin/line/click-track/route.ts";

  it("click_tracks テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasClickTrack = src.includes("click_tracks") || src.includes("click_track");
    expect(hasClickTrack).toBe(true);
  });
});

// ===================================================================
// アクション 固有テスト
// ===================================================================
describe("actions: アクション管理詳細", () => {
  const file = "app/api/admin/line/actions/route.ts";

  it("actions テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("actions");
  });
});

// ===================================================================
// Flexプリセット 固有テスト
// ===================================================================
describe("flex-presets: Flexプリセット詳細", () => {
  const file = "app/api/admin/line/flex-presets/route.ts";

  it("flex_presets テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("flex_presets");
  });
});

// ===================================================================
// メニュールール 固有テスト
// ===================================================================
describe("menu-rules: メニュールール詳細", () => {
  const file = "app/api/admin/line/menu-rules/route.ts";

  it("loadMenuRules/saveMenuRules でルールを管理している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasRules = src.includes("loadMenuRules") || src.includes("saveMenuRules");
    expect(hasRules).toBe(true);
  });
});

// ===================================================================
// リマインダールール 固有テスト
// ===================================================================
describe("reminder-rules: リマインダールール詳細", () => {
  const file = "app/api/admin/line/reminder-rules/route.ts";

  it("reminder_rules テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("reminder_rules");
  });
});

// ===================================================================
// クーポン 固有テスト
// ===================================================================
describe("coupons: クーポン管理詳細", () => {
  const file = "app/api/admin/line/coupons/route.ts";

  it("coupons テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("coupons");
  });
});

// ===================================================================
// ダッシュボード 固有テスト
// ===================================================================
describe("dashboard: LINE分析ダッシュボード詳細", () => {
  const file = "app/api/admin/line/dashboard/route.ts";

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });
});

// ===================================================================
// 友だち一覧 固有テスト
// ===================================================================
describe("friends-list: 友だち一覧詳細", () => {
  const file = "app/api/admin/line/friends-list/route.ts";

  it("patients テーブルから友だちを取得している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"patients"');
  });
});
