// __tests__/api/mypage-register.test.ts
// マイページ・患者登録・認証APIテスト
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

// ===================================================================
// マイページAPI
// ===================================================================
const MYPAGE_ROUTES = [
  { file: "app/api/mypage/route.ts", name: "マイページトップ" },
  { file: "app/api/mypage/identity/route.ts", name: "本人確認" },
  { file: "app/api/mypage/profile/route.ts", name: "プロフィール" },
  { file: "app/api/mypage/settings/route.ts", name: "設定" },
  { file: "app/api/mypage/orders/route.ts", name: "注文履歴" },
  { file: "app/api/mypage/update-address/route.ts", name: "住所変更" },
];

// identity/profile/settingsはCookieベースのシンプル実装でsupabaseAdmin不要
const MYPAGE_DB_ROUTES = MYPAGE_ROUTES.filter(
  (r) => !["identity", "profile", "settings"].some((name) => r.file.includes(name))
);

describe("マイページAPI（DB操作あり）: supabaseAdmin 使用", () => {
  for (const { file, name } of MYPAGE_DB_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("マイページAPI（DB操作あり）: テナント対応", () => {
  for (const { file, name } of MYPAGE_DB_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload") || src.includes("tenant_id");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("マイページAPI: HTTPメソッド", () => {
  for (const { file, name } of MYPAGE_ROUTES) {
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
// マイページ固有テスト
// ===================================================================
describe("mypage/identity: 本人確認詳細", () => {
  const file = "app/api/mypage/identity/route.ts";

  it("Cookie から patient_id を取得している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("patient_id");
  });

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });
});

describe("mypage/orders: 注文履歴詳細", () => {
  const file = "app/api/mypage/orders/route.ts";

  it("orders テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });
});

describe("mypage/update-address: 住所変更詳細", () => {
  const file = "app/api/mypage/update-address/route.ts";

  it("orders テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"orders"');
  });

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});

// ===================================================================
// 患者登録API
// ===================================================================
const REGISTER_ROUTES = [
  { file: "app/api/register/check/route.ts", name: "登録チェック" },
  { file: "app/api/register/personal-info/route.ts", name: "個人情報登録" },
  { file: "app/api/register/complete/route.ts", name: "登録完了" },
  { file: "app/api/register/complete-redirect/route.ts", name: "登録完了リダイレクト" },
];

describe("患者登録API: supabaseAdmin 使用", () => {
  for (const { file, name } of REGISTER_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("患者登録API: テナント対応", () => {
  for (const { file, name } of REGISTER_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload") || src.includes("tenant_id");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("患者登録API: HTTPメソッド", () => {
  for (const { file, name } of REGISTER_ROUTES) {
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
// 患者登録固有テスト
// ===================================================================
describe("register/check: 登録チェック詳細", () => {
  const file = "app/api/register/check/route.ts";

  it("patients テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"patients"');
  });
});

describe("register/personal-info: 個人情報登録詳細", () => {
  const file = "app/api/register/personal-info/route.ts";

  it("patients テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"patients"');
  });

  it("line_id を null で上書きしない（空のlineUserIdで既存値を消さない）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // 既存患者のupdate時に line_id: lineUserId || null を使っていないこと
    // 代わりにスプレッド構文で条件付きで含める
    expect(src).not.toMatch(/\.update\(\{[^}]*line_id:\s*lineUserId\s*\|\|\s*null/);
    expect(src).toContain("lineUserId ? { line_id: lineUserId } : {}");
  });
});

describe("register/complete: 登録完了詳細", () => {
  const file = "app/api/register/complete/route.ts";

  it("patients テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"patients"');
  });

  it("電話番号重複時に自動マージ処理がある", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("自動マージ開始");
    // line_id=null の旧アカウントのみマージ対象
    expect(src).toContain("dup.line_id");
    // 5テーブルを移行
    expect(src).toContain('"reservations"');
    expect(src).toContain('"intake"');
    expect(src).toContain('"orders"');
    expect(src).toContain('"reorders"');
    expect(src).toContain('"message_log"');
  });

  it("LINE連携済みの別アカウントはマージしない", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // line_idがある場合はcontinueでスキップ
    expect(src).toContain("if (dup.line_id) continue");
  });

  it("同一人物チェック（氏名またはカナ一致）を行う", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // 名前不一致時はスキップ
    expect(src).toContain("名前不一致のためマージスキップ");
    // 空白を正規化して比較
    expect(src).toContain('.replace(/\\s/g, "")');
    // 氏名 or カナどちらかの一致でOK
    expect(src).toContain("nameMatch");
    expect(src).toContain("kanaMatch");
  });
});

// ===================================================================
// SMS認証API
// ===================================================================
const VERIFY_ROUTES = [
  { file: "app/api/verify/send/route.ts", name: "認証コード送信" },
  { file: "app/api/verify/check/route.ts", name: "認証コード確認" },
];

describe("SMS認証API: HTTPメソッド", () => {
  for (const { file, name } of VERIFY_ROUTES) {
    it(`${name} は POST がエクスポートされている`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toMatch(/export\s+async\s+function\s+POST/);
    });
  }
});

describe("SMS認証API: テナント対応", () => {
  for (const { file, name } of VERIFY_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload") || src.includes("tenant_id");
      expect(hasTenant).toBe(true);
    });
  }
});
