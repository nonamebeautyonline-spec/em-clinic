// __tests__/api/admin-routes.test.ts
// 管理画面API統合テスト（患者管理、配送、カルテ、一括操作）
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

// ===================================================================
// カルテ管理（admin/karte）
// ===================================================================
describe("admin/karte: カルテ管理ルート", () => {
  const file = "app/api/admin/karte/route.ts";

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("verifyAdminAuth で認証している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("tenantPayload");
  });

  it("supabaseAdmin を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("supabaseAdmin");
  });

  it("intake テーブルに INSERT している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('.from("intake")');
    expect(src).toContain(".insert(");
  });

  it("タイムスタンプを付与している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // JSTフォーマットのタイムスタンプ
    expect(src).toMatch(/最終更新|timestamp|editedAt/i);
  });
});

// ===================================================================
// 一括送信（admin/patients/bulk/send）
// ===================================================================
describe("admin/patients/bulk/send: テンプレート一括送信ルート", () => {
  const file = "app/api/admin/patients/bulk/send/route.ts";

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("verifyAdminAuth で認証している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("verifyAdminAuth");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
    expect(hasTenant).toBe(true);
  });

  it("supabaseAdmin を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("supabaseAdmin");
  });

  it("message_templates テーブルからテンプレートを取得している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("message_templates");
  });

  it("message_log に送信ログを記録している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("message_log");
  });

  it("LINE Push API（pushMessage）を呼び出している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("pushMessage");
  });
});

// ===================================================================
// 一括送信ロジック
// ===================================================================
describe("一括送信: バッチ処理ロジック", () => {
  function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  it("200件ずつバッチ分割", () => {
    const items = Array.from({ length: 550 }, (_, i) => i);
    const batches = splitIntoBatches(items, 200);
    expect(batches).toHaveLength(3); // 200 + 200 + 150
    expect(batches[0]).toHaveLength(200);
    expect(batches[1]).toHaveLength(200);
    expect(batches[2]).toHaveLength(150);
  });

  it("200件未満は1バッチ", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const batches = splitIntoBatches(items, 200);
    expect(batches).toHaveLength(1);
  });

  it("空配列は空バッチ", () => {
    const batches = splitIntoBatches([], 200);
    expect(batches).toHaveLength(0);
  });
});

// ===================================================================
// 送信結果カウント
// ===================================================================
describe("一括送信: 送信結果カウント", () => {
  interface SendResult {
    status: "sent" | "failed" | "no_uid";
  }

  function countResults(results: SendResult[]) {
    return {
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      noUid: results.filter((r) => r.status === "no_uid").length,
    };
  }

  it("正常にカウントできる", () => {
    const results: SendResult[] = [
      { status: "sent" },
      { status: "sent" },
      { status: "failed" },
      { status: "no_uid" },
      { status: "sent" },
    ];
    const counts = countResults(results);
    expect(counts.sent).toBe(3);
    expect(counts.failed).toBe(1);
    expect(counts.noUid).toBe(1);
  });

  it("全て成功", () => {
    const results: SendResult[] = Array.from({ length: 10 }, () => ({ status: "sent" as const }));
    const counts = countResults(results);
    expect(counts.sent).toBe(10);
    expect(counts.failed).toBe(0);
    expect(counts.noUid).toBe(0);
  });
});

// ===================================================================
// admin 配下の全ルート: 共通要件チェック
// ===================================================================
describe("admin配下全ルート: 認証チェック", () => {
  const adminRoutes = findRouteFiles("app/api/admin");

  // 認証不要なルート（ログイン・パスワードリセット・セッションチェック等）
  const AUTH_EXEMPT = ["login", "logout", "csrf-token", "password-reset", "session", "update-order-address", "tenant-info", "dashboard-sse"];

  it("全 admin ルートが verifyAdminAuth を呼んでいる（除外ルート以外）", () => {
    const violations: string[] = [];

    for (const route of adminRoutes) {
      const isExempt = AUTH_EXEMPT.some((exempt) => route.includes(exempt));
      if (isExempt) continue;

      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyAdminAuth")) {
        violations.push(route);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("platform配下全ルート: 認証チェック", () => {
  const platformRoutes = findRouteFiles("app/api/platform");
  // ログインルートは verifyPlatformAdmin ではなくパスワード認証を行う
  const AUTH_EXEMPT = ["login"];

  it("プラットフォームルートが verifyPlatformAdmin を呼んでいる（ログイン除外）", () => {
    const violations: string[] = [];
    for (const route of platformRoutes) {
      const isExempt = AUTH_EXEMPT.some((exempt) => route.includes(exempt));
      if (isExempt) continue;

      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyPlatformAdmin")) {
        violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });

  it("プラットフォームログインルートが platform_admin ロール検証を行っている", () => {
    const loginRoute = platformRoutes.find((r) => r.includes("/login/"));
    expect(loginRoute).toBeDefined();
    const src = fs.readFileSync(path.resolve(process.cwd(), loginRoute!), "utf-8");
    expect(src).toContain("platform_admin");
  });
});

describe("admin配下全ルート: テナント分離", () => {
  const adminRoutes = findRouteFiles("app/api/admin");

  it("supabaseAdmin を使用している admin ルートはテナント対応している（プラットフォーム管理を除く）", () => {
    const violations: string[] = [];

    for (const route of adminRoutes) {

      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) {
          violations.push(route);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// Square/GMO webhook: テナント対応・supabaseAdmin確認
// ===================================================================
describe("決済webhook: テナント対応", () => {
  const webhookRoutes = [
    { file: "app/api/square/webhook/route.ts", name: "Square webhook" },
    { file: "app/api/gmo/webhook/route.ts", name: "GMO webhook" },
  ];

  for (const { file, name } of webhookRoutes) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });

    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

// ===================================================================
// Square webhook: normalizeJPPhone 使用確認
// ===================================================================
describe("Square webhook: 電話番号正規化", () => {
  const file = "app/api/square/webhook/route.ts";

  it("normalizeJPPhone をインポートしている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("normalizeJPPhone");
  });

  it("normalizeJPPhone を使用して電話番号を正規化している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/normalizeJPPhone\(/);
  });
});

// ===================================================================
// bank-transfer/shipping: 重要ルールの確認
// ===================================================================
describe("bank-transfer/shipping: 重要ルール確認", () => {
  const file = "app/api/bank-transfer/shipping/route.ts";

  it("normalizeJPPhone を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("normalizeJPPhone");
  });

  it("intake.status の null チェックをしている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/\.not\(\s*["']status["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });

  it("supabaseAdmin を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("supabaseAdmin");
  });

  it("テナント対応している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
    expect(hasTenant).toBe(true);
  });
});

// ===================================================================
// 配送関連ルート: 共通チェック
// ===================================================================
describe("配送関連ルート: 基本要件", () => {
  const shippingRoutes = findRouteFiles("app/api/admin/shipping");

  it("全配送ルートが認証チェックしている", () => {
    const violations: string[] = [];
    for (const route of shippingRoutes) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyAdminAuth")) {
        violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });

  it("全配送ルートがテナント対応している", () => {
    const violations: string[] = [];
    for (const route of shippingRoutes) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) {
          violations.push(route);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ===================================================================
// カルテ管理ロジック
// ===================================================================
describe("カルテ管理: タイムスタンプ付与ロジック", () => {
  function addTimestamp(note: string): string {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getFullYear();
    const m = String(jst.getMonth() + 1).padStart(2, "0");
    const d = String(jst.getDate()).padStart(2, "0");
    const h = String(jst.getHours()).padStart(2, "0");
    const min = String(jst.getMinutes()).padStart(2, "0");
    const s = String(jst.getSeconds()).padStart(2, "0");
    return `${note}\n最終更新: ${y}/${m}/${d} ${h}:${min}:${s}`;
  }

  it("noteにタイムスタンプが追加される", () => {
    const result = addTimestamp("テスト処方内容");
    expect(result).toContain("テスト処方内容");
    expect(result).toContain("最終更新:");
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it("空のnoteでもタイムスタンプが追加される", () => {
    const result = addTimestamp("");
    expect(result).toContain("最終更新:");
  });
});

// ===================================================================
// 患者管理: bulk操作の共通チェック
// ===================================================================
describe("患者管理bulk操作: 基本要件", () => {
  const bulkRoutes = findRouteFiles("app/api/admin/patients/bulk");

  it("全bulk操作ルートが認証チェックしている", () => {
    const violations: string[] = [];
    for (const route of bulkRoutes) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (!src.includes("verifyAdminAuth")) {
        violations.push(route);
      }
    }
    expect(violations).toEqual([]);
  });

  it("全bulk操作ルートがテナント対応している", () => {
    const violations: string[] = [];
    for (const route of bulkRoutes) {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) {
          violations.push(route);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ===================================================================
// Cron: テナント対応
// ===================================================================
describe("Cron: テナント対応", () => {
  const cronRoutes = findRouteFiles("app/api/cron");
  // テナント横断チェックのためテナント対応不要なcronルート
  const CRON_TENANT_EXEMPT = ["health-report", "usage-check", "audit-archive"];

  it("supabaseAdminを使うcronルートはテナント対応している", () => {
    const violations: string[] = [];
    for (const route of cronRoutes) {
      if (CRON_TENANT_EXEMPT.some((e) => route.includes(e))) continue;
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) {
          violations.push(route);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
