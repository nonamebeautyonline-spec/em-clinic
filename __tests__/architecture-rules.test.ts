// __tests__/architecture-rules.test.ts
// 過去の重大事故パターンを防止するアーキテクチャルールテスト
// ファイル内容をパターンマッチで検証し、禁止パターンの混入を検出する
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

// ===================================================================
// 事故1: anon key使用による665件の患者名null上書き（2026-02-09）
// intake/route.ts では必ず supabaseAdmin を使う
// ===================================================================
describe("intake/route.ts: supabaseAdmin使用を強制", () => {
  const src = readFile("app/api/intake/route.ts");

  it("supabaseAdmin をインポートしている", () => {
    expect(src).toContain("supabaseAdmin");
  });

  it("createClient() を直接使っていない", () => {
    // createClient はanon keyでの接続 → RLSで弾かれる
    expect(src).not.toMatch(/createClient\s*\(/);
  });
});

// ===================================================================
// 事故2: upsert({ onConflict: "patient_id" }) で23人のintakeが消失（2026-02-08）
// intake テーブルへの upsert は禁止（patient_id にユニーク制約なし）
// ===================================================================
describe("intake/route.ts: upsert禁止ルール", () => {
  const src = readFile("app/api/intake/route.ts");

  it("intake テーブルに対して onConflict: patient_id の upsert を使っていない", () => {
    // intake への upsert は全面禁止
    // ※ patients テーブルへの upsert は OK（patient_id にユニーク制約あり）
    const intakeSection = extractIntakeSection(src);
    expect(intakeSection).not.toMatch(/\.upsert\(/);
  });

  it("intake UPDATE は id を使っている（patient_id ではなく）", () => {
    // .update(...).eq("id", ...) パターンを使っていることを確認
    expect(src).toMatch(/\.update\([^)]*\)\s*\n?\s*\.eq\(\s*["']id["']/);
  });
});

// === intake/route.ts の intake テーブル操作部分を抽出 ===
function extractIntakeSection(src: string): string {
  // retrySupabaseWrite の最初のコールバック（intake書き込み）部分を取得
  const match = src.match(/\.from\("intake"\)[\s\S]*?return result;/);
  return match ? match[0] : "";
}

// ===================================================================
// 事故3: 再処方カルテを intake に INSERT した問題
// reorders.karte_note のみに保存する
// ===================================================================
describe("reorder承認: karte_note保存ルール", () => {
  const adminApprove = readFile("app/api/admin/reorders/approve/route.ts");

  it("karte_noteをreordersテーブルに保存している", () => {
    expect(adminApprove).toMatch(/\.from\(["']reorders["']\)\s*\n?\s*\.update\(\s*\{[^}]*karte_note/);
  });

  it("intakeテーブルにINSERTしていない", () => {
    // intake への insert は禁止
    expect(adminApprove).not.toMatch(/\.from\(["']intake["']\)\s*\n?\s*\.insert\(/);
  });

  it("冪等性チェック: .is('karte_note', null) を使っている", () => {
    expect(adminApprove).toMatch(/\.is\(\s*["']karte_note["']\s*,\s*null\s*\)/);
  });
});

// ===================================================================
// intake.status NG判定: .not("status", "is", null) 必須
// null の status を含めると再処方カルテレコードが混入する
// ===================================================================
describe("NG判定: .not('status', 'is', null) 必須（全3箇所）", () => {
  it("checkout/route.ts で status null 除外している", () => {
    const src = readFile("app/api/checkout/route.ts");
    expect(src).toMatch(/\.not\(\s*["']status["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });

  it("reorder/apply/route.ts で status null 除外している", () => {
    const src = readFile("app/api/reorder/apply/route.ts");
    expect(src).toMatch(/\.not\(\s*["']status["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });

  it("bank-transfer/shipping/route.ts で status null 除外している", () => {
    const src = readFile("app/api/bank-transfer/shipping/route.ts");
    expect(src).toMatch(/\.not\(\s*["']status["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });
});

// ===================================================================
// reorder-karte.ts: intake テーブルは使わない
// ===================================================================
describe("reorder-karte.ts: intakeテーブル不使用", () => {
  const src = readFile("lib/reorder-karte.ts");

  it("intakeテーブルに対するfromがない", () => {
    expect(src).not.toMatch(/\.from\(\s*["']intake["']\s*\)/);
  });

  it("reordersテーブルのみを操作している", () => {
    const fromMatches = src.match(/\.from\(\s*["'](\w+)["']\s*\)/g) || [];
    for (const match of fromMatches) {
      expect(match).toContain("reorders");
    }
  });
});

// ===================================================================
// マルチテナント: withTenant の一貫した使用
// ===================================================================
describe("テナント分離: supabaseAdmin直接クエリにwithTenant適用", () => {
  it("intake/route.ts でstrictWithTenantを使用している", () => {
    const src = readFile("app/api/intake/route.ts");
    expect(src).toMatch(/withTenant|strictWithTenant/);
    expect(src).toMatch(/resolveTenantId|resolveTenantIdOrThrow/);
  });

  it("checkout/route.ts でwithTenantを使用している", () => {
    const src = readFile("app/api/checkout/route.ts");
    expect(src).toMatch(/withTenant|strictWithTenant/);
    expect(src).toMatch(/resolveTenantId|resolveTenantIdOrThrow/);
  });

  it("reorder/apply/route.ts でstrictWithTenantを使用している", () => {
    const src = readFile("app/api/reorder/apply/route.ts");
    expect(src).toMatch(/withTenant|strictWithTenant/);
    expect(src).toMatch(/resolveTenantId|resolveTenantIdOrThrow/);
  });

  it("admin/reorders/approve でstrictWithTenantを使用している", () => {
    const src = readFile("app/api/admin/reorders/approve/route.ts");
    expect(src).toMatch(/withTenant|strictWithTenant/);
    expect(src).toMatch(/resolveTenantId|resolveTenantIdOrThrow/);
  });
});

// ===================================================================
// マルチテナント: withTenant/resolveTenantId 全ルート監査
// supabaseAdmin で DB 操作する全ルートがテナント分離対応であること
// ===================================================================
describe("テナント分離: 全APIルートの withTenant 適用監査", () => {
  // テナント対応不要なルート（DB操作なし or テナント概念なし）
  const TENANT_EXEMPT_ROUTES = new Set([
    "app/api/csrf-token/route.ts",
    "app/api/health/route.ts",
    "app/api/cron/health-report/route.ts",
    // 全テナント横断のCronジョブ（テナント単位ではなく全テナントをループ処理）
    "app/api/cron/usage-check/route.ts",
    "app/api/cron/audit-archive/route.ts",
    "app/api/cron/usage-alert/route.ts",
    "app/api/cron/report-usage/route.ts",
    "app/api/cron/generate-invoices/route.ts",
    "app/api/cron/send-reports/route.ts",
    "app/api/cron/square-token-refresh/route.ts",
    "app/api/cron/webhook-cleanup/route.ts",
    "app/api/cron/refresh-metrics/route.ts",
    // cron/ai-reply（全テナント横断のAI返信デバウンス・expired清掃Cron）
    "app/api/cron/ai-reply/route.ts",
    // 署名付きURL認証API（テナントIDはドラフトDBから取得）
    "app/api/ai-reply/[draftId]/route.ts",
    "app/api/ai-reply/[draftId]/reject/route.ts",
    // Google Calendar OAuthコールバック（stateパラメータからtenantIdを取得し直接.eq()で使用）
    "app/api/admin/google-calendar/callback/route.ts",
  ]);

  function findRouteFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findRouteFiles(full));
      } else if (entry.name === "route.ts") {
        results.push(full);
      }
    }
    return results;
  }

  it("supabaseAdmin をインポートしている全ルートが withTenant or resolveTenantId を使用している", () => {
    const apiDir = path.resolve(process.cwd(), "app/api");
    const routes = findRouteFiles(apiDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const relativePath = path.relative(process.cwd(), routePath);
      if (TENANT_EXEMPT_ROUTES.has(relativePath)) continue;
      // プラットフォーム管理ルートはテナント横断のため除外
      if (relativePath.startsWith("app/api/platform/")) continue;
      // Stripe連携ルートはプラットフォーム管理者用（テナント横断）
      if (relativePath.startsWith("app/api/stripe/")) continue;

      const src = fs.readFileSync(routePath, "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("strictWithTenant") || src.includes("resolveTenantId") || src.includes("resolveTenantIdOrThrow") || src.includes("tenantPayload") || src.includes("tenant_id") || src.includes('from("tenants")');
        if (!hasTenant) {
          violations.push(relativePath);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// マルチテナント: 管理系APIではstrictWithTenantを使用
// withTenant（null許容）ではなく strictWithTenant（必須）を使う
// ===================================================================
describe("テナント分離: 管理系APIではstrictWithTenantを使用", () => {
  const STRICT_TENANT_DIRS = [
    "app/api/admin",
    "app/api/mypage",
    "app/api/intake",
    "app/api/reservations",
    "app/api/reorder",
  ];

  it("withTenantをimportしているがstrictWithTenantをimportしていないファイルがない", () => {
    const violations: string[] = [];

    for (const dir of STRICT_TENANT_DIRS) {
      const fullDir = path.resolve(process.cwd(), dir);
      const routes = findAllRouteFiles(fullDir);

      for (const routePath of routes) {
        const src = fs.readFileSync(routePath, "utf-8");
        const relativePath = path.relative(process.cwd(), routePath);
        // withTenant をimportしているが strictWithTenant をimportしていない場合はNG
        if (src.includes("withTenant") && !src.includes("strictWithTenant")) {
          violations.push(relativePath);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// supabaseAdmin 使用監査:
// 重要ルートが anon key を誤って使わないこと
// ===================================================================
describe("supabaseAdmin: 重要ルートの使用確認", () => {
  const CRITICAL_ROUTES = [
    "app/api/intake/route.ts",
    "app/api/checkout/route.ts",
    "app/api/reorder/apply/route.ts",
    "app/api/bank-transfer/shipping/route.ts",
    "app/api/admin/reorders/approve/route.ts",
    "app/api/admin/patientbundle/route.ts",
  ];

  for (const route of CRITICAL_ROUTES) {
    it(`${route} は supabaseAdmin を使っている`, () => {
      const src = readFile(route);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

// ===================================================================
// 電話番号正規化: normalizeJPPhone 適用監査
// 電話番号を保存するルートが正規化を適用していること
// ===================================================================
describe("normalizeJPPhone: 電話番号保存ルートの正規化適用", () => {
  const PHONE_ROUTES = [
    { file: "app/api/intake/route.ts", description: "intake保存" },
    { file: "lib/webhook-handlers/square.ts", description: "Square決済webhookハンドラ" },
    { file: "app/api/bank-transfer/shipping/route.ts", description: "銀行振込配送" },
    { file: "app/api/admin/patientbundle/route.ts", description: "patientbundle表示" },
  ];

  for (const { file, description } of PHONE_ROUTES) {
    it(`${description}（${file}）で normalizeJPPhone をインポートしている`, () => {
      const src = readFile(file);
      expect(src).toContain("normalizeJPPhone");
    });
  }
});

// ===================================================================
// 禁止遷移ガード: 状態遷移の逆行を防止するルール
// docs/domain-boundaries.md セクション10「禁止遷移」をCIで強制
// ===================================================================
describe("禁止遷移ガード: reorders.status 更新は必ずガード条件付き", () => {
  // reorders.status を更新する全ファイル
  const REORDER_UPDATE_FILES = [
    "app/api/doctor/reorders/approve/route.ts",
    "app/api/admin/reorders/approve/route.ts",
    "app/api/doctor/reorders/reject/route.ts",
    "app/api/admin/reorders/reject/route.ts",
    "app/api/reorder/cancel/route.ts",
  ];

  for (const file of REORDER_UPDATE_FILES) {
    it(`${file}: status更新前に現在statusを検証している`, () => {
      const src = readFile(file);
      // .eq("status", "...") または .in("status", [...]) でガード
      const hasGuard =
        /\.eq\(\s*["']status["']/.test(src) ||
        /\.in\(\s*["']status["']/.test(src) ||
        /status\s*!==?\s*["']/.test(src);
      expect(hasGuard).toBe(true);
    });
  }

  // rejected は最終状態 → rejected から別状態への遷移コードが存在してはならない
  it("rejected → 他状態への遷移コードが存在しない", () => {
    const apiDir = path.resolve(process.cwd(), "app/api");
    const routes = findAllRouteFiles(apiDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const src = fs.readFileSync(routePath, "utf-8");
      // .eq("status", "rejected") の後に .update が続くパターンを検出
      if (src.match(/\.eq\(\s*["']status["']\s*,\s*["']rejected["']\s*\)[\s\S]{0,100}\.update\(/)) {
        violations.push(path.relative(process.cwd(), routePath));
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("禁止遷移ガード: webhook決済で reorders.status は confirmed→paid のみ", () => {
  const WEBHOOK_FILES = [
    "app/api/square/webhook/route.ts",
    "app/api/gmo/webhook/route.ts",
    "app/api/bank-transfer/shipping/route.ts",
  ];

  for (const file of WEBHOOK_FILES) {
    it(`${file}: reorders更新は .eq("status", "confirmed") ガード付き`, () => {
      const src = readFile(file);
      // reordersテーブルへのupdate + statusガードの組み合わせを検証
      const reorderUpdates = src.match(/\.from\(\s*["']reorders["']\s*\)[\s\S]{0,500}\.update\(/g);
      if (!reorderUpdates) return; // reorder更新がないならスキップ

      // confirmed ガードが存在すること
      expect(src).toMatch(/\.eq\(\s*["']status["']\s*,\s*["']confirmed["']\s*\)/);
    });
  }
});

describe("禁止遷移ガード: orders.payment_status は逆行しない", () => {
  it("全ルートで payment_status を pending に戻すコードが存在しない", () => {
    const apiDir = path.resolve(process.cwd(), "app/api");
    const routes = findAllRouteFiles(apiDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const src = fs.readFileSync(routePath, "utf-8");
      // payment_status: "pending" を update で設定するパターンを検出
      // ※ INSERT/upsert での初期値設定は許容（新規作成時のみ）
      if (src.match(/\.update\(\s*\{[^}]*payment_status:\s*["']pending["']/)) {
        violations.push(path.relative(process.cwd(), routePath));
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("禁止遷移ガード: orders.shipping_status は逆行しない", () => {
  it("全ルートで shipping_status を shipped→pending に戻すコードが存在しない", () => {
    const apiDir = path.resolve(process.cwd(), "app/api");
    const routes = findAllRouteFiles(apiDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const src = fs.readFileSync(routePath, "utf-8");
      // shipping_status: "pending" を update で設定するパターンを検出
      if (src.match(/\.update\(\s*\{[^}]*shipping_status:\s*["']pending["']/)) {
        violations.push(path.relative(process.cwd(), routePath));
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("禁止遷移ガード: shipping_status→shipped 更新は必ずガード付き", () => {
  // shipping_status を "shipped" に更新するファイル
  const SHIPPING_UPDATE_FILES = [
    "app/api/admin/shipping/update-tracking/route.ts",
    "app/api/admin/shipping/update-tracking/confirm/route.ts",
  ];

  for (const file of SHIPPING_UPDATE_FILES) {
    it(`${file}: shipped更新に .eq("shipping_status", "pending") ガードがある`, () => {
      const src = readFile(file);
      // shipping_status: "shipped" の更新が存在すること（前提確認）
      expect(src).toMatch(/shipping_status:\s*["']shipped["']/);
      // .eq("shipping_status", "pending") ガードが存在すること
      expect(src).toMatch(/\.eq\(\s*["']shipping_status["']\s*,\s*["']pending["']\s*\)/);
    });
  }
});

// 全ルートファイルを再帰取得するヘルパー（テスト間で共有）
function findAllRouteFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllRouteFiles(full));
    } else if (entry.name === "route.ts") {
      results.push(full);
    }
  }
  return results;
}

// ===================================================================
// intake upsert 禁止: 全ルートで intake に upsert していないこと
// ===================================================================
describe("intake upsert禁止: 全ルート監査", () => {
  function findRouteFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findRouteFiles(full));
      } else if (entry.name === "route.ts") {
        results.push(full);
      }
    }
    return results;
  }

  it("全ルートで intake テーブルに upsert していない", () => {
    const apiDir = path.resolve(process.cwd(), "app/api");
    const routes = findRouteFiles(apiDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const src = fs.readFileSync(routePath, "utf-8");
      // intake テーブルに対する upsert を検出
      if (src.match(/\.from\(\s*["']intake["']\s*\)[\s\S]{0,200}\.upsert\(/)) {
        violations.push(path.relative(process.cwd(), routePath));
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// SWR移行: 基盤設定と移行品質の自動監査
// ===================================================================
describe("SWR移行ルール", () => {
  it("admin layout.tsx に SWRProvider が含まれている", () => {
    const src = readFile("app/admin/layout.tsx");
    expect(src).toContain("SWRProvider");
    expect(src).toContain('import { SWRProvider }');
  });

  it("SWR config の fetcher が credentials: include を付与している", () => {
    const src = readFile("lib/swr/config.ts");
    expect(src).toContain('credentials: "include"');
  });

  it("SWR config で revalidateOnFocus: false（医療データ保護）", () => {
    const src = readFile("lib/swr/config.ts");
    expect(src).toContain("revalidateOnFocus: false");
  });

  // SWR移行済みページリスト: 移行完了時にここに追加
  // 完全移行: useEffect内fetchが全てSWRに置換済み
  const SWR_MIGRATED_PAGES = [
    // 段階1-2: パイロット+中程度ページ
    "app/admin/line/tags/page.tsx",
    "app/admin/line/marks/page.tsx",
    "app/admin/shipping/settings/page.tsx",
    "app/admin/products/page.tsx",
    "app/admin/inventory/page.tsx",
    "app/admin/line/templates/page.tsx",
    "app/admin/line/friends/page.tsx",
    // 段階4: Simple (1-2 fetches)
    "app/admin/shipping/today/page.tsx",
    "app/admin/shipping/pending/page.tsx",
    "app/admin/line/messages/page.tsx",
    "app/admin/line/ai-reply-stats/page.tsx",
    "app/admin/karte-history/page.tsx",
    "app/admin/webhook-events/page.tsx",
    "app/admin/line/broadcasts/page.tsx",
    "app/admin/line/analytics/page.tsx",
    "app/admin/schedule/settings/page.tsx",
    "app/admin/schedule/doctors/page.tsx",
    "app/admin/line/forms/[id]/responses/page.tsx",
    "app/admin/accounting/statement/page.tsx",
    // 段階4: Medium (3-5 fetches)
    "app/admin/reorders/page.tsx",
    "app/admin/onboarding/page.tsx",
    "app/admin/line/column-settings/page.tsx",
    "app/admin/dedup-patients/page.tsx",
    "app/admin/line/followup-rules/page.tsx",
    "app/admin/line/click-analytics/page.tsx",
    "app/admin/line/ai-reply-settings/page.tsx",
    "app/admin/inventory/journal/page.tsx",
    "app/admin/bank-transfer/page.tsx",
    "app/admin/segments/page.tsx",
    "app/admin/line/step-scenarios/page.tsx",
    "app/admin/line/friends/fields/page.tsx",
    // 段階4: Medium-High (5-7 fetches)
    "app/admin/billing/page.tsx",
    "app/admin/accounting/page.tsx",
    "app/admin/schedule/slots/page.tsx",
    "app/admin/line/keyword-replies/page.tsx",
    "app/admin/line/actions/page.tsx",
    "app/admin/line/rich-menus/page.tsx",
    "app/admin/line/media/page.tsx",
    "app/admin/line/chatbot/page.tsx",
    "app/admin/line/menu-rules/page.tsx",
    "app/admin/noname-master/page.tsx",
  ];

  // 部分移行: SWR導入済みだがイベント駆動fetchやpollingが残るページ
  // （検索デバウンス、heartbeat、edit session polling等）
  const SWR_PARTIAL_PAGES = [
    "app/admin/karte/page.tsx",
    "app/admin/line/talk/_components/talk/useTalkState.ts",
    "app/admin/layout.tsx",
    // 段階4: 複雑ページ（部分移行）
    "app/admin/doctor/page.tsx",
    "app/admin/line/friends/[id]/page.tsx",
    "app/admin/line/send/page.tsx",
    "app/admin/line/coupons/page.tsx",
    "app/admin/ehr/page.tsx",
    "app/admin/bank-transfer/reconcile/page.tsx",
    "app/admin/line/forms/[id]/page.tsx",
    "app/admin/schedule/monthly/page.tsx",
    "app/admin/line/step-scenarios/[id]/page.tsx",
    "app/admin/dashboard/page.tsx",
    "app/admin/kartesearch/page.tsx",
    "app/admin/settings/page.tsx",
    // schedule/page.tsx はレイアウトページ（SWRは子コンポーネントで使用）
    "app/admin/patients/[patientId]/page.tsx",
    "app/admin/line/page.tsx",
    "app/admin/accounting/input/page.tsx",
    "app/admin/intake-form/page.tsx",
    "app/admin/line/friend-settings/page.tsx",
    "app/admin/line/flex-builder/page.tsx",
    "app/admin/line/flow-builder/page.tsx",
    "app/admin/shipping/create-list/page.tsx",
    "app/admin/schedule/weekly/page.tsx",
    "app/admin/reservations/calendar-view.tsx",
  ];

  for (const pagePath of SWR_PARTIAL_PAGES) {
    it(`部分移行ページ ${pagePath} がuseSWRを使用している`, () => {
      const src = readFile(pagePath);
      expect(src).toMatch(/useSWR[<(]/);
    });
  }

  for (const pagePath of SWR_MIGRATED_PAGES) {
    describe(`移行済みページ: ${pagePath}`, () => {
      const src = readFile(pagePath);

      it("useEffect内でデータ取得fetchを使用していない", () => {
        // useEffect(... fetch( ... のパターンを検出
        // ただしmutation（POST/PUT/DELETE）のfetchは許可（auto-save等）
        const useEffectBlocks = src.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[/g) || [];
        for (const block of useEffectBlocks) {
          // fetch呼び出しがある場合、それがmutation（method指定あり）でなければNG
          const fetchCalls = block.match(/fetch\s*\(/g) || [];
          const mutationFetches = block.match(/method\s*:\s*["'](POST|PUT|DELETE)["']/g) || [];
          // 全fetchがmutationなら許可（auto-save等のパターン）
          const dataFetchCount = fetchCalls.length - mutationFetches.length;
          expect(dataFetchCount).toBeLessThanOrEqual(0);
        }
      });

      it("setIntervalを使用していない", () => {
        expect(src).not.toMatch(/setInterval\s*\(/);
      });

      it("useCallbackでfetchDataを定義していない", () => {
        // loadMore等のページネーション用fetchは許可、初期データ取得のfetchDataパターンのみ禁止
        expect(src).not.toMatch(/const\s+fetchData\s*=\s*useCallback/);
      });
    });
  }
});

// ===================================================================
// Cronジョブ障害検知: 全cronルートに notifyCronFailure を強制
// 失敗時にSlack/LINE通知が飛ばないと障害に気づけない
// ===================================================================
describe("Cronジョブ障害検知: 全cronルートに notifyCronFailure 必須", () => {
  it("app/api/cron/ 配下の全 route.ts が notifyCronFailure をインポートしている", () => {
    const cronDir = path.resolve(process.cwd(), "app/api/cron");
    const routes = findAllRouteFiles(cronDir);
    const violations: string[] = [];

    for (const routePath of routes) {
      const src = fs.readFileSync(routePath, "utf-8");
      if (!src.includes("notifyCronFailure")) {
        violations.push(path.relative(process.cwd(), routePath));
      }
    }

    expect(violations).toEqual([]);
  });
});

// ===================================================================
// 事故: Vercel fire-and-forget で予約通知29件がfetch failed（2026-03-13）
// APIルートでレスポンス返却前にasync処理をawaitしないと
// Vercelサーバーレス環境でコンテキスト破棄→fetch failedになる
// ===================================================================
describe("reservations/route.ts: fire-and-forget禁止", () => {
  const src = readFile("app/api/reservations/route.ts");

  it("executeReservationActionsはawaitで呼び出している", () => {
    // fire-and-forget パターン: executeReservationActions({...}).catch(...)
    const fireAndForget = src.match(/executeReservationActions\s*\(\s*\{[\s\S]*?\}\s*\)\s*\.catch/g) || [];
    expect(fireAndForget).toHaveLength(0);
  });

  it("evaluateMenuRulesはawaitで呼び出している", () => {
    const fireAndForget = src.match(/evaluateMenuRules\s*\([^)]*\)\s*\.catch/g) || [];
    expect(fireAndForget).toHaveLength(0);
  });
});

// ===================================================================
// 分割コンポーネントの責務境界
// Phase Eで分割した4つの巨大ファイルが再肥大化しないよう、
// ファイル種別ごとの責務ルールをテストで強制する
// ===================================================================
describe("分割コンポーネントの責務境界", () => {
  // --- ルール1: page/エントリーポイントは構成のみ（supabaseAdmin禁止） ---
  describe("page/エントリーポイントはsupabaseAdminを直接使わない", () => {
    const entryPoints = [
      "app/admin/dashboard/page.tsx",
      "app/doctor/page.tsx",
      "app/admin/line/talk/_components/TalkClient.tsx",
      "app/mypage/PatientDashboardInner.tsx",
    ];

    for (const file of entryPoints) {
      it(`${file} は supabaseAdmin をimportしていない`, () => {
        const src = readFile(file);
        expect(src).not.toMatch(/import\s+.*supabaseAdmin/);
      });
    }
  });

  // --- ルール2: hooks (use*.ts) は supabaseAdmin を使わない ---
  describe("hooks は supabaseAdmin を使わない", () => {
    const hookDirs = [
      "app/admin/line/talk/_components/talk",
      "app/mypage/_components/dashboard",
      "app/admin/dashboard/hooks",
      "app/doctor/_components",
    ];

    for (const dir of hookDirs) {
      const absDir = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(absDir)) continue;
      const hooks = fs.readdirSync(absDir).filter((f: string) => /^use.*\.ts$/.test(f));
      for (const hook of hooks) {
        it(`${dir}/${hook} は supabaseAdmin をimportしていない`, () => {
          const src = readFile(`${dir}/${hook}`);
          expect(src).not.toMatch(/import\s+.*supabaseAdmin/);
        });
      }
    }
  });

  // --- ルール3: Context は fetch/DB操作しない ---
  describe("Context は fetch/DB操作しない", () => {
    const contextFiles = [
      "app/admin/line/talk/_components/talk/TalkContext.tsx",
      "app/mypage/_components/dashboard/DashboardContext.tsx",
    ];

    for (const file of contextFiles) {
      it(`${file} は fetch() を含まない`, () => {
        const src = readFile(file);
        // fetch( の呼び出しを検出（type定義やコメント内は除外しない厳密チェック）
        expect(src).not.toMatch(/\bfetch\s*\(/);
      });

      it(`${file} は supabaseAdmin を使わない`, () => {
        const src = readFile(file);
        expect(src).not.toMatch(/import\s+.*supabaseAdmin/);
      });
    }
  });

  // --- ルール4: types.ts はランタイムimportしない ---
  describe("types.ts はランタイムimportしない", () => {
    const typeFiles = [
      "app/admin/line/talk/_components/talk/types.ts",
      "app/mypage/_components/dashboard/types.ts",
      "app/doctor/_components/types.ts",
    ];

    for (const file of typeFiles) {
      it(`${file} は "use client" を含まない`, () => {
        const src = readFile(file);
        expect(src).not.toContain('"use client"');
      });

      it(`${file} は type-only import のみ使用している`, () => {
        const src = readFile(file);
        // import文のうち `import type` でないものを検出
        // ただし空行やコメントは除外
        const nonTypeImports = src
          .split("\n")
          .filter((line: string) => /^\s*import\s/.test(line) && !/^\s*import\s+type\s/.test(line));
        expect(nonTypeImports).toHaveLength(0);
      });
    }
  });

  // --- ルール5: 分割済みエントリーポイントの行数制限 ---
  describe("分割済みエントリーポイントの行数上限", () => {
    const limits: [string, number][] = [
      ["app/admin/dashboard/page.tsx", 400],
      ["app/doctor/page.tsx", 250],
      ["app/admin/line/talk/_components/TalkClient.tsx", 400],
      ["app/mypage/PatientDashboardInner.tsx", 400],
    ];

    for (const [file, maxLines] of limits) {
      it(`${file} は ${maxLines}行以下`, () => {
        const src = readFile(file);
        const lineCount = src.split("\n").length;
        expect(lineCount).toBeLessThanOrEqual(maxLines);
      });
    }
  });
});

// ===================================================================
// 監査ログ網羅性チェック:
// 書き込み系admin APIは全て logAudit を呼び出すべき
// ※ 現時点では警告のみ（CI失敗にしない）。段階的に対応を進める
// ===================================================================
describe("監査ログ網羅性チェック", () => {
  // 監査ログ不要なルート（認証・セッション系エンドポイント）
  const AUDIT_EXEMPT_PATHS = [
    "admin/login",
    "admin/logout",
    "admin/session",
    "admin/csrf-token",
    "admin/setup",
    "admin/forgot-password",
    "admin/reset-password",
    "admin/account",
    "admin/dashboard-sse",
    "admin/unread-count",
    "admin/chat-reads",
  ];

  function isExempt(relativePath: string): boolean {
    return AUDIT_EXEMPT_PATHS.some((exempt) =>
      relativePath.includes(`app/api/${exempt}/`)
    );
  }

  it("書き込み系admin APIでlogAudit未使用のルートを検出する", () => {
    const adminApiDir = path.resolve(process.cwd(), "app/api/admin");
    const routes = findAllRouteFiles(adminApiDir);
    const missing: string[] = [];

    for (const routePath of routes) {
      const relativePath = path.relative(process.cwd(), routePath);
      if (isExempt(relativePath)) continue;

      const src = fs.readFileSync(routePath, "utf-8");
      // POST, PUT, PATCH, DELETE のいずれかをexportしているか
      const hasWriteExport = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/.test(src);
      if (!hasWriteExport) continue;

      if (!src.includes("logAudit")) {
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      console.warn(
        `[監査ログ未対応] 以下の${missing.length}ルートにlogAuditがありません:\n` +
          missing.map((f) => `  - ${f}`).join("\n")
      );
    }

    // 警告のみ — テスト自体は常にパス
    expect(true).toBe(true);
  });
});

// ===================================================================
// バリデーション網羅性チェック:
// POST/PUT/PATCH を受け付ける admin API は parseBody または
// Zodスキーマによるバリデーションを行うべき
// ※ 現時点では警告のみ（CI失敗にしない）
// ===================================================================
describe("バリデーション網羅性チェック", () => {
  const VALIDATION_EXEMPT_PATHS = [
    "admin/login",
    "admin/logout",
    "admin/session",
    "admin/csrf-token",
    "admin/setup",
    "admin/forgot-password",
    "admin/reset-password",
    "admin/account",
    "admin/dashboard-sse",
    "admin/unread-count",
    "admin/chat-reads",
  ];

  function isExempt(relativePath: string): boolean {
    // 認証・セッション系
    if (VALIDATION_EXEMPT_PATHS.some((exempt) => relativePath.includes(`app/api/${exempt}/`))) {
      return true;
    }
    // webhook系はリクエスト構造が外部依存のため除外
    if (relativePath.includes("webhook")) return true;
    return false;
  }

  it("POST/PUT/PATCHを受けるadmin APIでバリデーション未使用のルートを検出する", () => {
    const adminApiDir = path.resolve(process.cwd(), "app/api/admin");
    const routes = findAllRouteFiles(adminApiDir);
    const missing: string[] = [];

    for (const routePath of routes) {
      const relativePath = path.relative(process.cwd(), routePath);
      if (isExempt(relativePath)) continue;

      const src = fs.readFileSync(routePath, "utf-8");
      // POST, PUT, PATCH のいずれかをexportしているか
      const hasWriteExport = /export\s+(async\s+)?function\s+(POST|PUT|PATCH)\b/.test(src);
      if (!hasWriteExport) continue;

      // バリデーションパターンの検出
      const hasValidation =
        src.includes("parseBody") ||
        src.includes("adminLoginSchema") ||
        /z\.object\s*\(/.test(src) ||
        /\.parse\s*\(/.test(src) ||
        /\.safeParse\s*\(/.test(src);

      if (!hasValidation) {
        missing.push(relativePath);
      }
    }

    if (missing.length > 0) {
      console.warn(
        `[バリデーション未対応] 以下の${missing.length}ルートにparseBody/Zodバリデーションがありません:\n` +
          missing.map((f) => `  - ${f}`).join("\n")
      );
    }

    // 警告のみ — テスト自体は常にパス
    expect(true).toBe(true);
  });
});

// ===================================================================
// page.tsx 直接fetch禁止チェック:
// admin の page.tsx は直接 fetch() や supabaseAdmin を使わず、
// hooks やサーバーコンポーネント経由でデータ取得すべき
// ※ 現時点では警告のみ（CI失敗にしない）
// ===================================================================
describe("page.tsx 直接データ取得禁止チェック", () => {
  function findPageFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findPageFiles(full));
      } else if (entry.name === "page.tsx") {
        results.push(full);
      }
    }
    return results;
  }

  it("admin page.tsxでfetch()やsupabaseAdminを直接使用しているページを検出する", () => {
    const adminDir = path.resolve(process.cwd(), "app/admin");
    const pages = findPageFiles(adminDir);
    const directFetch: string[] = [];
    const directSupabase: string[] = [];

    for (const pagePath of pages) {
      const relativePath = path.relative(process.cwd(), pagePath);
      const src = fs.readFileSync(pagePath, "utf-8");

      if (/\bfetch\s*\(/.test(src)) {
        directFetch.push(relativePath);
      }
      if (src.includes("supabaseAdmin")) {
        directSupabase.push(relativePath);
      }
    }

    if (directFetch.length > 0) {
      console.warn(
        `[直接fetch検出] 以下の${directFetch.length}ページがpage.tsx内で直接fetch()を使用しています:\n` +
          directFetch.map((f) => `  - ${f}`).join("\n")
      );
    }
    if (directSupabase.length > 0) {
      console.warn(
        `[直接supabaseAdmin検出] 以下の${directSupabase.length}ページがpage.tsx内で直接supabaseAdminを使用しています:\n` +
          directSupabase.map((f) => `  - ${f}`).join("\n")
      );
    }

    // 警告のみ — テスト自体は常にパス
    expect(true).toBe(true);
  });
});

// ===================================================================
// 大規模ファイル検出（400行超）:
// 肥大化したファイルは保守性が低下するため早期に検出する
// ※ 現時点では警告のみ（CI失敗にしない）
// ===================================================================
describe("大規模ファイル検出（400行超）", () => {
  // 意図的に大きいファイル、またはリファクタリング予定のファイル
  const LARGE_FILE_EXCEPTIONS = new Set([
    "app/api/line/webhook/route.ts",
    "app/admin/layout.tsx",
    "app/api/admin/line/dashboard/route.ts",
  ]);

  function findTsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      if (entry.isDirectory()) {
        results.push(...findTsFiles(full));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        results.push(full);
      }
    }
    return results;
  }

  it("400行を超えるts/tsxファイルを検出する", () => {
    const LINE_LIMIT = 400;
    const largeFiles: { file: string; lines: number }[] = [];

    const dirs = [
      path.resolve(process.cwd(), "app"),
      path.resolve(process.cwd(), "lib"),
    ];

    for (const dir of dirs) {
      const files = findTsFiles(dir);
      for (const filePath of files) {
        const relativePath = path.relative(process.cwd(), filePath);
        if (LARGE_FILE_EXCEPTIONS.has(relativePath)) continue;

        const src = fs.readFileSync(filePath, "utf-8");
        const lineCount = src.split("\n").length;
        if (lineCount > LINE_LIMIT) {
          largeFiles.push({ file: relativePath, lines: lineCount });
        }
      }
    }

    if (largeFiles.length > 0) {
      largeFiles.sort((a, b) => b.lines - a.lines);
      console.warn(
        `[大規模ファイル] 以下の${largeFiles.length}ファイルが${LINE_LIMIT}行を超えています:\n` +
          largeFiles.map((f) => `  - ${f.file} (${f.lines}行)`).join("\n")
      );
    }

    // 警告のみ — テスト自体は常にパス
    expect(true).toBe(true);
  });
});
