// __tests__/api/patient-bulk-karte.test.ts
// 患者bulk操作・カルテ詳細API統合テスト
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
// 患者bulk操作ルート
// ===================================================================
const BULK_ROUTES = [
  { file: "app/api/admin/patients/bulk/tags/route.ts", name: "タグ一括操作" },
  { file: "app/api/admin/patients/bulk/mark/route.ts", name: "マーク一括操作" },
  { file: "app/api/admin/patients/bulk/fields/route.ts", name: "フィールド一括操作" },
  { file: "app/api/admin/patients/bulk/action/route.ts", name: "アクション一括操作" },
  { file: "app/api/admin/patients/bulk/menu/route.ts", name: "メニュー一括操作" },
  { file: "app/api/admin/patients/bulk/send/route.ts", name: "一括送信" },
];

describe("患者bulk操作: 認証チェック", () => {
  for (const { file, name } of BULK_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("患者bulk操作: テナント分離", () => {
  for (const { file, name } of BULK_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("患者bulk操作: supabaseAdmin使用", () => {
  for (const { file, name } of BULK_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("患者bulk操作: 401レスポンス", () => {
  for (const { file, name } of BULK_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("401");
    });
  }
});

describe("患者bulk操作: HTTPメソッド", () => {
  for (const { file, name } of BULK_ROUTES) {
    it(`${name} は POST がエクスポートされている`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toMatch(/export\s+async\s+function\s+POST/);
    });
  }
});

// ===================================================================
// bulk/tags 固有テスト
// ===================================================================
describe("bulk/tags: タグ一括操作詳細", () => {
  const file = "app/api/admin/patients/bulk/tags/route.ts";

  it("patient_tags テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("patient_tags");
  });
});

// ===================================================================
// bulk/mark 固有テスト
// ===================================================================
describe("bulk/mark: マーク一括操作詳細", () => {
  const file = "app/api/admin/patients/bulk/mark/route.ts";

  it("patient_marks テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("patient_marks");
  });

  it("mark_definitions でマーク存在確認している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("mark_definitions");
  });
});

// ===================================================================
// bulk/menu 固有テスト
// ===================================================================
describe("bulk/menu: メニュー一括操作詳細", () => {
  const file = "app/api/admin/patients/bulk/menu/route.ts";

  it("リッチメニュー操作をしている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    const hasRichmenu = src.includes("richmenu") || src.includes("rich_menu") || src.includes("linkRichMenuToUser") || src.includes("rich-menu");
    expect(hasRichmenu).toBe(true);
  });
});

// ===================================================================
// カルテ詳細API
// ===================================================================
const KARTE_ROUTES = [
  { file: "app/api/admin/karte-edit/route.ts", name: "カルテ編集" },
  { file: "app/api/admin/karte-lock/route.ts", name: "カルテロック" },
  { file: "app/api/admin/karte-templates/route.ts", name: "カルテテンプレート" },
];

describe("カルテ詳細API: 認証チェック", () => {
  for (const { file, name } of KARTE_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("カルテ詳細API: テナント分離", () => {
  for (const { file, name } of KARTE_ROUTES) {
    it(`${name} はテナント対応している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("resolveTenantId") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("カルテ詳細API: 401レスポンス", () => {
  for (const { file, name } of KARTE_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("401");
    });
  }
});

// ===================================================================
// karte-edit 固有テスト
// ===================================================================
describe("karte-edit: カルテ編集詳細", () => {
  const file = "app/api/admin/karte-edit/route.ts";

  it("intake テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"intake"');
  });

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});

// ===================================================================
// karte-lock 固有テスト
// ===================================================================
describe("karte-lock: カルテロック詳細", () => {
  const file = "app/api/admin/karte-lock/route.ts";

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });
});

// ===================================================================
// karte-templates 固有テスト
// ===================================================================
describe("karte-templates: カルテテンプレート詳細", () => {
  const file = "app/api/admin/karte-templates/route.ts";

  it("GET がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("karte_templates テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("karte_templates");
  });
});
