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
