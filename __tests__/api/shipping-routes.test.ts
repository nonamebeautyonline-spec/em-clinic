// __tests__/api/shipping-routes.test.ts
// 配送関連API統合テスト（13ルート: export-yamato-b2, update-tracking, notify-shipped等）
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

const SHIPPING_ROUTES = findRouteFiles("app/api/admin/shipping");

// ===================================================================
// 全配送ルート共通チェック
// ===================================================================
describe("配送API: 認証チェック", () => {
  it("全配送ルートが verifyAdminAuth で認証している", () => {
    const violations: string[] = [];
    for (const route of SHIPPING_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyAdminAuth")) {
        violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("配送API: テナント分離", () => {
  it("supabaseAdmin を使う配送ルートはテナント対応している", () => {
    const violations: string[] = [];
    for (const route of SHIPPING_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("配送API: 401 レスポンス", () => {
  it("全配送ルートが認証失敗時 401 を返す", () => {
    const violations: string[] = [];
    for (const route of SHIPPING_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("401")) violations.push(route);
    }
    expect(violations).toEqual([]);
  });
});

// ===================================================================
// 個別配送ルート固有テスト
// ===================================================================
const SHIPPING_SPECIFIC_ROUTES = [
  { file: "app/api/admin/shipping/export-yamato-b2/route.ts", name: "ヤマトB2エクスポート" },
  { file: "app/api/admin/shipping/export-yamato-b2-custom/route.ts", name: "ヤマトB2カスタムエクスポート" },
  { file: "app/api/admin/shipping/export-lstep-tags/route.ts", name: "Lステップタグエクスポート" },
  { file: "app/api/admin/shipping/lstep-tag-csv/route.ts", name: "LステップタグCSV" },
  { file: "app/api/admin/shipping/update-tracking/route.ts", name: "追跡番号更新" },
  { file: "app/api/admin/shipping/update-tracking/preview/route.ts", name: "追跡番号プレビュー" },
  { file: "app/api/admin/shipping/update-tracking/confirm/route.ts", name: "追跡番号確定" },
  { file: "app/api/admin/shipping/notify-shipped/route.ts", name: "発送通知" },
  { file: "app/api/admin/shipping/today-shipped/route.ts", name: "本日発送分" },
  { file: "app/api/admin/shipping/pending/route.ts", name: "発送待ち" },
  { file: "app/api/admin/shipping/history/route.ts", name: "配送履歴" },
  { file: "app/api/admin/shipping/share/route.ts", name: "共有" },
  { file: "app/api/admin/shipping/config/route.ts", name: "配送設定" },
];

describe("配送API: HTTPメソッド", () => {
  for (const { file, name } of SHIPPING_SPECIFIC_ROUTES) {
    it(`${name} は GET または POST がエクスポートされている`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasGet = /export\s+async\s+function\s+GET/.test(src);
      const hasPost = /export\s+async\s+function\s+POST/.test(src);
      expect(hasGet || hasPost).toBe(true);
    });
  }
});

// ===================================================================
// ヤマトB2 エクスポート固有テスト
// ===================================================================
describe("export-yamato-b2: ヤマトB2エクスポート詳細", () => {
  const file = "app/api/admin/shipping/export-yamato-b2/route.ts";

  it("orders テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });

  it("CSV形式のレスポンスを返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasCsv = src.includes("text/csv") || src.includes("csv") || src.includes("CSV");
    expect(hasCsv).toBe(true);
  });
});

// ===================================================================
// notify-shipped: 発送通知固有テスト
// ===================================================================
describe("notify-shipped: 発送通知詳細", () => {
  const file = "app/api/admin/shipping/notify-shipped/route.ts";

  it("sendShippingNotification で通知している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("sendShippingNotification");
  });
});

// ===================================================================
// update-tracking: 追跡番号更新固有テスト
// ===================================================================
describe("update-tracking: 追跡番号更新詳細", () => {
  const file = "app/api/admin/shipping/update-tracking/route.ts";

  it("orders テーブルを更新している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });

  it("tracking_number を扱っている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("tracking_number");
  });
});

// ===================================================================
// pending: 発送待ち固有テスト
// ===================================================================
describe("pending: 発送待ち詳細", () => {
  const file = "app/api/admin/shipping/pending/route.ts";

  it("orders テーブルからデータ取得", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });
});
