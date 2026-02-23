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
  it("intake/route.ts でwithTenantを使用している", () => {
    const src = readFile("app/api/intake/route.ts");
    expect(src).toContain("withTenant");
    expect(src).toContain("resolveTenantId");
  });

  it("checkout/route.ts でwithTenantを使用している", () => {
    const src = readFile("app/api/checkout/route.ts");
    expect(src).toContain("withTenant");
    expect(src).toContain("resolveTenantId");
  });

  it("reorder/apply/route.ts でwithTenantを使用している", () => {
    const src = readFile("app/api/reorder/apply/route.ts");
    expect(src).toContain("withTenant");
    expect(src).toContain("resolveTenantId");
  });

  it("admin/reorders/approve でwithTenantを使用している", () => {
    const src = readFile("app/api/admin/reorders/approve/route.ts");
    expect(src).toContain("withTenant");
    expect(src).toContain("resolveTenantId");
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
    // 署名付きURL認証API（テナントIDはドラフトDBから取得）
    "app/api/ai-reply/[draftId]/route.ts",
    "app/api/ai-reply/[draftId]/reject/route.ts",
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

      const src = fs.readFileSync(routePath, "utf-8");
      if (src.includes("supabaseAdmin")) {
        const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
        if (!hasTenant) {
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
    { file: "app/api/square/webhook/route.ts", description: "Square決済webhook" },
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
