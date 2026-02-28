// __tests__/api/tenant-isolation.test.ts
// テナント間データ分離テスト
// 全admin/患者APIルートがテナント対応していることをアーキテクチャルールで検証
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { withTenant, tenantPayload, resolveTenantId } from "@/lib/tenant";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
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

// テナント対応が不要なルート（DB操作なし、特殊用途、またはIDベースアクセス）
const TENANT_EXEMPT_ROUTES = new Set([
  // 認証・セッション系（DB操作なし or JWT内にtenantId含有）
  "app/api/admin/logout/route.ts",
  "app/api/admin/session/route.ts",
  "app/api/csrf-token/route.ts",
  // キャッシュ管理（テナント別キーで既に管理）
  "app/api/admin/invalidate-cache/route.ts",
  // ヘルスチェック（全テナント共通）
  "app/api/health/route.ts",
  // 無効化済み
  "app/api/square/backfill/route.ts",
  // DB操作なし（cookie/プロフィール）
  "app/api/profile/route.ts",
  "app/api/mypage/identity/route.ts",
  "app/api/mypage/profile/route.ts",
  // AI返信ドラフト操作（署名認証 + 一意IDアクセスでテナント分離は暗黙的に成立）
  "app/api/ai-reply/[draftId]/route.ts",
  "app/api/ai-reply/[draftId]/reject/route.ts",
  // cron/health-report（全テナント横断の監視レポート）
  "app/api/cron/health-report/route.ts",
  // cron/usage-check（全テナント横断の使用量チェックCron）
  "app/api/cron/usage-check/route.ts",
  // cron/audit-archive（全テナント横断の監査ログアーカイブCron）
  "app/api/cron/audit-archive/route.ts",
  // Google Calendar OAuthコールバック（stateパラメータからtenantIdを取得し直接.eq()で使用）
  "app/api/admin/google-calendar/callback/route.ts",
]);

// platform APIはスーパー管理者用で意図的にテナント横断アクセスするため、テナントフィルター不要
const isPlatformRoute = (f: string) => f.startsWith("app/api/platform/");

// ===================================================================
// テナント分離ルール1: 全admin APIルートのテナント対応チェック
// ===================================================================
describe("テナント分離: admin APIルート", () => {
  const adminRoutes = findRouteFiles("app/api/admin");

  it("admin APIルートが存在する", () => {
    expect(adminRoutes.length).toBeGreaterThan(50);
  });

  // DBアクセスがあるルートは必ずテナント対応していること
  const dbRoutes = adminRoutes.filter(f => {
    if (TENANT_EXEMPT_ROUTES.has(f)) return false;
    const src = readFile(f);
    return src.includes('.from("') || src.includes(".from('");
  });

  it.each(dbRoutes)("%s がテナント対応している", (routePath) => {
    const src = readFile(routePath);
    const hasTenantSupport =
      src.includes("resolveTenantId") ||
      src.includes("withTenant") ||
      src.includes("tenantPayload");
    expect(hasTenantSupport).toBe(true);
  });
});

// ===================================================================
// テナント分離ルール2: 患者向けAPIルートのテナント対応チェック
// ===================================================================
describe("テナント分離: 患者向けAPIルート", () => {
  const allRoutes = findRouteFiles("app/api");
  const patientRoutes = allRoutes.filter(
    f =>
      !f.startsWith("app/api/admin/") &&
      !f.startsWith("app/api/platform/") &&
      !f.startsWith("app/api/cron/")
  );

  it("患者向けAPIルートが存在する", () => {
    expect(patientRoutes.length).toBeGreaterThan(20);
  });

  // DBアクセスがあるルートは必ずテナント対応していること
  const dbRoutes = patientRoutes.filter(f => {
    if (TENANT_EXEMPT_ROUTES.has(f)) return false;
    const src = readFile(f);
    // supabaseAdmin.from() or supabase.from() があるか
    return src.includes('.from("') || src.includes(".from('");
  });

  it.each(dbRoutes)("%s がテナント対応している", (routePath) => {
    const src = readFile(routePath);
    const hasTenantSupport =
      src.includes("resolveTenantId") ||
      src.includes("withTenant") ||
      src.includes("tenantPayload") ||
      src.includes("getSettingOrEnv"); // テナント別設定取得
    expect(hasTenantSupport).toBe(true);
  });
});

// ===================================================================
// テナント分離ルール3: cron APIルートのテナント対応チェック
// ===================================================================
describe("テナント分離: cron APIルート", () => {
  const cronRoutes = findRouteFiles("app/api/cron");

  it("cron APIルートが存在する", () => {
    expect(cronRoutes.length).toBeGreaterThan(0);
  });

  // cronはDB操作があれば全テナントを処理するか、テナントフィルターを使う
  const dbRoutes = cronRoutes.filter(f => {
    if (TENANT_EXEMPT_ROUTES.has(f)) return false;
    const src = readFile(f);
    return src.includes('.from("') || src.includes(".from('");
  });

  it.each(dbRoutes)("%s がテナント対応またはテナント横断処理している", (routePath) => {
    const src = readFile(routePath);
    const hasTenantSupport =
      src.includes("resolveTenantId") ||
      src.includes("withTenant") ||
      src.includes("tenantPayload") ||
      src.includes("tenant_id"); // テナント横断でも tenant_id を参照している
    expect(hasTenantSupport).toBe(true);
  });
});

// ===================================================================
// テナント分離ルール4: INSERT時のtenantPayload使用チェック
// ===================================================================
describe("テナント分離: INSERT時のtenantPayload", () => {
  const allRoutes = findRouteFiles("app/api");

  // .insert() を使用しているファイルを全て検出（platform APIは除外）
  const insertRoutes = allRoutes.filter(f => {
    if (TENANT_EXEMPT_ROUTES.has(f) || isPlatformRoute(f)) return false;
    const src = readFile(f);
    return src.includes(".insert(") && src.includes('.from("');
  });

  it("INSERT操作があるルートが存在する", () => {
    expect(insertRoutes.length).toBeGreaterThan(10);
  });

  it.each(insertRoutes)("%s がINSERT時にtenantPayloadを使用している", (routePath) => {
    const src = readFile(routePath);
    // tenantPayload or 直接 tenant_id を含むオブジェクトリテラル
    const hasTenantInsert =
      src.includes("tenantPayload") ||
      src.includes("tenant_id:");
    expect(hasTenantInsert).toBe(true);
  });
});

// ===================================================================
// テナント分離ルール5: withTenantの呼び出しパターン検証
// ===================================================================
describe("テナント分離: withTenantの使用パターン", () => {
  const allRoutes = findRouteFiles("app/api");

  // resolveTenantIdをインポートしているファイル
  const tenantRoutes = allRoutes.filter(f => {
    const src = readFile(f);
    return src.includes("resolveTenantId");
  });

  it("テナント対応ルートが50以上存在する", () => {
    expect(tenantRoutes.length).toBeGreaterThan(50);
  });

  it.each(tenantRoutes)("%s がresolveTenantIdを呼び出している", (routePath) => {
    const src = readFile(routePath);
    // import だけでなく、実際に呼び出していることを確認
    expect(src).toMatch(/resolveTenantId\s*\(/);
  });
});

// ===================================================================
// テナント分離ルール6: 主要テーブルのSELECTにwithTenantが必須
// ===================================================================
describe("テナント分離: 主要テーブルのSELECT保護", () => {
  // テナント分離が必須のテーブル
  const PROTECTED_TABLES = [
    "patients",
    "intake",
    "reservations",
    "orders",
    "reorders",
    "message_log",
    "broadcasts",
    "message_templates",
    "ai_reply_drafts",
    "ai_reply_settings",
    "products",
    "tag_definitions",
    "patient_tags",
    "patient_marks",
    "mark_definitions",
    "rich_menus",
    "keyword_auto_replies",
    "friend_field_definitions",
    "friend_field_values",
  ];

  const allRoutes = findRouteFiles("app/api");

  for (const table of PROTECTED_TABLES) {
    const routesUsingTable = allRoutes.filter(f => {
      if (TENANT_EXEMPT_ROUTES.has(f) || isPlatformRoute(f)) return false;
      const src = readFile(f);
      return src.includes(`.from("${table}")`);
    });

    if (routesUsingTable.length === 0) continue;

    describe(`テーブル: ${table}`, () => {
      it.each(routesUsingTable)(`%s が ${table} アクセス時にテナント対応している`, (routePath) => {
        const src = readFile(routePath);
        const hasTenantSupport =
          src.includes("withTenant") ||
          src.includes("tenantPayload") ||
          src.includes("resolveTenantId");
        expect(hasTenantSupport).toBe(true);
      });
    });
  }
});

// ===================================================================
// テナント分離ルール7: lib/tenant.ts の整合性
// ===================================================================
describe("テナント分離: lib/tenant.ts ユーティリティ", () => {
  const src = readFile("lib/tenant.ts");

  it("resolveTenantId がエクスポートされている", () => {
    expect(src).toMatch(/export\s+function\s+resolveTenantId/);
  });

  it("withTenant がエクスポートされている", () => {
    expect(src).toMatch(/export\s+function\s+withTenant/);
  });

  it("tenantPayload がエクスポートされている", () => {
    expect(src).toMatch(/export\s+function\s+tenantPayload/);
  });

  it("x-tenant-id ヘッダーを参照している", () => {
    expect(src).toContain("x-tenant-id");
  });

  it("withTenantがeqメソッドでtenant_idフィルターを追加", () => {
    expect(src).toContain('.eq("tenant_id"');
  });

  it("tenantPayloadがnull/空文字をデフォルトテナントIDにフォールバック", () => {
    expect(src).toContain("tenantId || DEFAULT_TENANT_ID");
  });
});

// ===================================================================
// テナント分離ルール8: middleware.ts のテナント解決
// ===================================================================
describe("テナント分離: middleware.ts", () => {
  const src = readFile("middleware.ts");

  it("x-tenant-id ヘッダーを設定している", () => {
    expect(src).toContain("x-tenant-id");
  });

  it("JWTからtenantIdを取得している", () => {
    expect(src).toContain("tenantId");
  });

  it("サブドメインからテナント解決している", () => {
    expect(src).toMatch(/slug|subdomain/i);
  });

  it("予約済みスラグを除外している", () => {
    // admin, www, localhost 等は通常テナントではない
    expect(src).toMatch(/RESERVED_SLUGS|reservedSlugs|reserved/i);
  });
});

// ===================================================================
// テナント分離ルール9: platform APIのテナントID指定アクセス
// ===================================================================
describe("テナント分離: platform APIのtenantIdパラメータ", () => {
  const platformTenantRoutes = findRouteFiles("app/api/platform/tenants/[tenantId]");

  it("テナントID指定のplatformルートが存在する", () => {
    expect(platformTenantRoutes.length).toBeGreaterThan(0);
  });

  // tenantId パスパラメータを使ってフィルタリングしていることを確認
  it.each(platformTenantRoutes)("%s がtenantIdでフィルタリングしている", (routePath) => {
    const src = readFile(routePath);
    // tenantId パラメータを使ってDBクエリしている
    const usesTenantId =
      src.includes("tenantId") ||
      src.includes("tenant_id") ||
      src.includes("params");
    expect(usesTenantId).toBe(true);
  });
});

// ===================================================================
// テナント分離ルール10: バックフィルスクリプトの網羅性
// ===================================================================
describe("テナント分離: バックフィルスクリプト", () => {
  const src = readFile("scripts/backfill-tenant-id.cjs");

  // コード内でtenantPayloadを使うテーブルがバックフィル対象に含まれているか
  const MUST_BACKFILL_TABLES = [
    "patients", "intake", "reservations", "orders", "reorders",
    "message_log", "message_templates", "broadcasts",
    "tag_definitions", "patient_tags", "patient_marks",
    "rich_menus", "keyword_auto_replies", "products",
    "followup_rules", "followup_logs", "undo_history",
  ];

  it.each(MUST_BACKFILL_TABLES)("テーブル %s がバックフィル対象に含まれている", (table) => {
    expect(src).toContain(`"${table}"`);
  });
});

// ===================================================================
// テナント分離ルール11: withTenant ユニットテスト
// ===================================================================
describe("テナント分離: withTenant 関数の動作検証", () => {
  function createMockQuery() {
    const calls: { method: string; args: any[] }[] = [];
    const proxy: any = new Proxy({}, {
      get(_, prop) {
        return (...args: any[]) => {
          calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    });
    return { proxy, calls };
  }

  it("tenantId が非null のとき .eq('tenant_id', tenantId) を適用する", () => {
    const { proxy, calls } = createMockQuery();
    withTenant(proxy, "tenant-abc-123");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("eq");
    expect(calls[0].args).toEqual(["tenant_id", "tenant-abc-123"]);
  });

  it("tenantId が null のときフィルターを追加しない", () => {
    const { proxy, calls } = createMockQuery();
    const result = withTenant(proxy, null);
    expect(calls).toHaveLength(0);
    expect(result).toBe(proxy);
  });

  it("tenantId が空文字のときフィルターを追加しない", () => {
    const { proxy, calls } = createMockQuery();
    withTenant(proxy, "");
    expect(calls).toHaveLength(0);
  });
});

// ===================================================================
// テナント分離ルール12: tenantPayload ユニットテスト
// ===================================================================
describe("テナント分離: tenantPayload 関数の動作検証", () => {
  it("tenantId が非null のとき { tenant_id: tenantId } を返す", () => {
    expect(tenantPayload("abc")).toEqual({ tenant_id: "abc" });
  });

  it("tenantId が null のときデフォルトテナントIDにフォールバック", () => {
    expect(tenantPayload(null)).toEqual({ tenant_id: "00000000-0000-0000-0000-000000000001" });
  });

  it("tenantId が空文字のときデフォルトテナントIDにフォールバック", () => {
    expect(tenantPayload("")).toEqual({ tenant_id: "00000000-0000-0000-0000-000000000001" });
  });
});

// ===================================================================
// テナント分離ルール13: resolveTenantId ユニットテスト
// ===================================================================
describe("テナント分離: resolveTenantId 関数の動作検証", () => {
  it("x-tenant-id ヘッダーがあるときテナントIDを返す", () => {
    const headers = new Headers({ "x-tenant-id": "tenant-xyz" });
    expect(resolveTenantId({ headers })).toBe("tenant-xyz");
  });

  it("ヘッダーがないとき null を返す", () => {
    const headers = new Headers();
    expect(resolveTenantId({ headers })).toBeNull();
  });

  it("request が undefined のとき null を返す", () => {
    expect(resolveTenantId(undefined)).toBeNull();
  });

  it("request.headers が undefined のとき null を返す", () => {
    expect(resolveTenantId({})).toBeNull();
  });
});

// ===================================================================
// テナント分離ルール14: ダッシュボードAPIの分離検証
// ===================================================================
describe("テナント分離: ダッシュボードAPIの分離", () => {
  it("dashboard-stats-enhanced が resolveTenantId と withTenant を使用している", () => {
    const src = readFile("app/api/admin/dashboard-stats-enhanced/route.ts");
    expect(src).toContain("resolveTenantId");
    expect(src).toContain("withTenant");
  });

  it("dashboard-stats-enhanced の全クエリが withTenant で囲まれている", () => {
    const src = readFile("app/api/admin/dashboard-stats-enhanced/route.ts");
    const fromCalls = src.match(/supabaseAdmin\s*\.\s*from\(/g) || [];
    const withTenantCalls = src.match(/withTenant\s*\(/g) || [];
    // 全 from() が withTenant で囲まれている
    expect(withTenantCalls.length).toBeGreaterThanOrEqual(fromCalls.length);
  });

  it("dashboard-sse がテナントIDを取得して使用している", () => {
    const src = readFile("app/api/admin/dashboard-sse/route.ts");
    expect(src).toContain("tenantId");
    expect(src).toContain("withTenant");
  });
});

// ===================================================================
// テナント分離ルール15: ダッシュボードレイアウトAPIの分離検証
// ===================================================================
describe("テナント分離: ダッシュボードレイアウトAPI", () => {
  it("dashboard-layout が resolveTenantId を使用している", () => {
    const src = readFile("app/api/admin/dashboard-layout/route.ts");
    expect(src).toContain("resolveTenantId");
  });

  it("dashboard-layout が tenant_settings 経由でテナント別保存している", () => {
    const src = readFile("app/api/admin/dashboard-layout/route.ts");
    expect(src).toContain("getSetting");
    expect(src).toContain("setSetting");
    expect(src).toContain("tenantId");
  });
});

// ===================================================================
// テナント分離ルール16: クロステナントクエリ禁止パターンの検出
// ===================================================================
describe("テナント分離: 禁止パターンの検出", () => {
  const allRoutes = findRouteFiles("app/api");

  it("管理APIルートにテナントIDのハードコードがない", () => {
    const violations: string[] = [];
    const hardcodedTenantPattern = /\.eq\(\s*["']tenant_id["']\s*,\s*["'][0-9a-f]{8}-/g;

    for (const f of allRoutes) {
      const src = readFile(f);
      if (hardcodedTenantPattern.test(src)) {
        violations.push(f);
      }
      hardcodedTenantPattern.lastIndex = 0;
    }

    expect(violations).toEqual([]);
  });

  it("admin APIで .is('tenant_id', null) による意図しない全テナント横断クエリがない", () => {
    const violations: string[] = [];

    for (const f of allRoutes) {
      if (isPlatformRoute(f)) continue;
      const src = readFile(f);
      if (src.match(/\.is\(\s*["']tenant_id["']\s*,\s*null\s*\)/)) {
        // tenant_settings は null テナント（グローバル設定）を許可
        if (f.includes("settings")) continue;
        violations.push(f);
      }
    }

    expect(violations).toEqual([]);
  });

  it("resolveTenantId が引数付きで呼び出されている（引数なし呼び出し禁止）", () => {
    const violations: string[] = [];

    for (const f of allRoutes) {
      const src = readFile(f);
      if (!src.includes("resolveTenantId")) continue;
      if (src.match(/resolveTenantId\(\s*\)/)) {
        violations.push(f);
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// テナント分離ルール17: withTenant インポート元の一貫性
// ===================================================================
describe("テナント分離: withTenant のインポート元検証", () => {
  const allRoutes = findRouteFiles("app/api");

  // Edge Runtime は lib/tenant が使えないためローカル定義を許可
  const LOCAL_DEFINITION_ALLOWED = new Set([
    "app/api/admin/dashboard-sse/route.ts",
  ]);

  it("withTenant を使うルートは lib/tenant からインポートしている（ローカル再定義禁止）", () => {
    const violations: string[] = [];

    for (const f of allRoutes) {
      if (LOCAL_DEFINITION_ALLOWED.has(f)) continue;
      const src = readFile(f);
      if (!src.includes("withTenant")) continue;

      const hasProperImport =
        src.includes('from "@/lib/tenant"') ||
        src.includes("from '@/lib/tenant'");
      const hasLocalDefinition =
        src.includes("function withTenant") ||
        src.includes("const withTenant");

      if (hasLocalDefinition && !hasProperImport) {
        violations.push(`${f}: withTenant をローカル定義（lib/tenant を使用すべき）`);
      }
    }

    expect(violations).toEqual([]);
  });
});
