// __tests__/api/ai-compose-and-recommend.test.ts
// AI文面生成APIのルートテスト
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
// ai-compose API基本要件
// ===================================================================
const AI_ROUTES = [
  { file: "app/api/admin/line/ai-compose/route.ts", name: "ai-compose（AI文面生成）" },
];

describe("AI関連API: ファイル存在確認", () => {
  for (const { file, name } of AI_ROUTES) {
    it(`${name} のルートファイルが存在する`, () => {
      expect(fileExists(file)).toBe(true);
    });
  }
});

describe("AI関連API: 認証チェック", () => {
  for (const { file, name } of AI_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("AI関連API: テナント分離", () => {
  for (const { file, name } of AI_ROUTES) {
    it(`${name} は resolveTenantId を使用している`, () => {
      const src = readFile(file);
      expect(src).toContain("resolveTenantId");
    });

    it(`${name} は withTenant を使用している`, () => {
      const src = readFile(file);
      expect(src).toContain("withTenant");
    });
  }
});

describe("AI関連API: 認証失敗時 401 レスポンス", () => {
  for (const { file, name } of AI_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      const src = readFile(file);
      expect(src).toContain("unauthorized");
    });
  }
});

describe("AI関連API: Anthropic SDK使用", () => {
  for (const { file, name } of AI_ROUTES) {
    it(`${name} は Anthropic SDK をインポートしている`, () => {
      const src = readFile(file);
      expect(src).toContain("@anthropic-ai/sdk");
    });

    it(`${name} は claude-sonnet-4-6 モデルを使用している`, () => {
      const src = readFile(file);
      expect(src).toContain("claude-sonnet-4-6");
    });

    it(`${name} は getSettingOrEnv でAPIキーを取得している`, () => {
      const src = readFile(file);
      expect(src).toContain("getSettingOrEnv");
      expect(src).toContain("ANTHROPIC_API_KEY");
    });
  }
});

// ===================================================================
// ai-compose（AI文面生成）固有テスト
// ===================================================================
describe("ai-compose: AI文面生成ルート", () => {
  const file = "app/api/admin/line/ai-compose/route.ts";

  it("POST がエクスポートされている", () => {
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("purpose パラメータを必須チェックしている", () => {
    const src = readFile(file);
    expect(src).toContain("purpose");
  });

  it("target_audience パラメータを必須チェックしている", () => {
    const src = readFile(file);
    expect(src).toContain("target_audience");
  });

  it("tone パラメータ（formal/casual/urgent）をバリデーションしている", () => {
    const src = readFile(file);
    expect(src).toContain("formal");
    expect(src).toContain("casual");
    expect(src).toContain("urgent");
  });

  it("既存テンプレートをコンテキストとして取得している", () => {
    const src = readFile(file);
    expect(src).toContain("message_templates");
    expect(src).toContain("limit(5)");
  });

  it("レスポンスに message と alternatives を含む", () => {
    const src = readFile(file);
    expect(src).toContain("message:");
    expect(src).toContain("alternatives:");
  });

  it("max_length のデフォルト値が 500", () => {
    const src = readFile(file);
    expect(src).toContain("max_length = 500");
  });
});

// ===================================================================
// UI統合テスト（ソースコード検証）
// ===================================================================
describe("send/page.tsx: AI文面生成UI統合", () => {
  const file = "app/admin/line/send/page.tsx";

  it("AI文面生成ボタンが存在する", () => {
    const src = readFile(file);
    expect(src).toContain("AI文面生成");
  });

  it("AI文面生成モーダルが存在する", () => {
    const src = readFile(file);
    expect(src).toContain("showAiCompose");
  });

  it("ai-compose APIを呼び出している", () => {
    const src = readFile(file);
    expect(src).toContain("/api/admin/line/ai-compose");
  });

  it("生成結果のメイン案と代替案を表示している", () => {
    const src = readFile(file);
    expect(src).toContain("メイン案");
    expect(src).toContain("代替案");
  });

  it("生成された文面をテキストエリアに挿入する機能がある", () => {
    const src = readFile(file);
    expect(src).toContain("applyAiMessage");
  });
});
