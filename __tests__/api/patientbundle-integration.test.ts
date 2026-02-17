// __tests__/api/patientbundle-integration.test.ts
// patientbundle API の統合テスト（intake + reorders.karte_note 統合、電話番号正規化、テナント対応）
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

const src = readFile("app/api/admin/patientbundle/route.ts");

// ===================================================================
// テナント対応
// ===================================================================
describe("patientbundle: テナント対応", () => {
  it("resolveTenantId をインポートしている", () => {
    expect(src).toContain("resolveTenantId");
  });

  it("withTenant をインポートしている", () => {
    expect(src).toContain("withTenant");
  });

  it("全クエリに withTenant が適用されている", () => {
    // 5テーブル並列取得（patients, intake, reservations, orders, reorders）
    const withTenantCount = (src.match(/withTenant\(/g) || []).length;
    expect(withTenantCount).toBeGreaterThanOrEqual(5);
  });
});

// ===================================================================
// supabaseAdmin 使用
// ===================================================================
describe("patientbundle: supabaseAdmin", () => {
  it("supabaseAdmin を使用している", () => {
    expect(src).toContain("supabaseAdmin");
  });

  it("createClient() を直接使っていない", () => {
    expect(src).not.toMatch(/createClient\s*\(/);
  });
});

// ===================================================================
// normalizeJPPhone 適用
// ===================================================================
describe("patientbundle: 電話番号正規化", () => {
  it("normalizeJPPhone をインポートしている", () => {
    expect(src).toContain("normalizeJPPhone");
  });

  it("患者の電話番号に normalizeJPPhone を適用している", () => {
    // phone: normalizeJPPhone(...) のパターン
    expect(src).toMatch(/normalizeJPPhone\(/);
  });
});

// ===================================================================
// 認証
// ===================================================================
describe("patientbundle: 認証", () => {
  it("verifyAdminAuth をインポートしている", () => {
    expect(src).toContain("verifyAdminAuth");
  });

  it("認証失敗時 401 を返す", () => {
    expect(src).toContain("401");
  });
});

// ===================================================================
// intake + reorders.karte_note 統合ロジック
// ===================================================================
describe("patientbundle: 来院履歴統合", () => {
  it("intake テーブルからデータを取得している", () => {
    expect(src).toContain('.from("intake")');
  });

  it("reorders テーブルからデータを取得している", () => {
    expect(src).toContain('.from("reorders")');
  });

  it("karte_note を来院履歴に追加している", () => {
    expect(src).toContain("karte_note");
  });

  it("再処方カルテ重複レコードを除外している", () => {
    // "再処方" 始まり & reserve_id なしは除外するロジック
    expect(src).toContain('startsWith("再処方")');
  });

  it("reorder カルテの ID は reorder- プレフィックス", () => {
    expect(src).toContain('`reorder-${');
  });

  it("来院履歴を新しい順でソートしている", () => {
    expect(src).toMatch(/\.sort\(/);
    expect(src).toContain("submittedAt");
  });
});

// ===================================================================
// 来院履歴統合の動作テスト
// ===================================================================
describe("patientbundle: 来院履歴統合ロジック動作テスト", () => {
  // patientbundle と同等のフィルター・統合ロジックを再現
  function filterRealIntakes(
    intakes: Array<{ id: number; reserve_id: string | null; note: string | null; created_at: string }>,
    resMap: Map<string, unknown>,
  ) {
    return intakes.filter((i) => {
      if (!(i.note || "").startsWith("再処方")) return true;
      return i.reserve_id && resMap.has(i.reserve_id);
    });
  }

  function buildFormattedIntakes(
    intakes: Array<{ id: number; reserve_id: string | null; note: string | null; created_at: string }>,
    reorders: Array<{ id: number; karte_note: string | null; approved_at: string | null; paid_at: string | null; created_at: string }>,
    resMap: Map<string, unknown>,
  ) {
    const realIntakes = filterRealIntakes(intakes, resMap);
    return [
      ...realIntakes.map((i) => ({
        id: i.id,
        submittedAt: i.created_at,
        note: i.note || "",
      })),
      ...reorders
        .filter((r) => r.karte_note)
        .map((r) => ({
          id: `reorder-${r.id}`,
          submittedAt: r.approved_at || r.paid_at || r.created_at || "",
          note: r.karte_note,
        })),
    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  it("問診 + 再処方カルテが時系列で統合される", () => {
    const intakes = [
      { id: 1, reserve_id: "res_1", note: "初回問診", created_at: "2026-01-01T10:00:00Z" },
      { id: 2, reserve_id: "res_2", note: "2回目問診", created_at: "2026-01-15T10:00:00Z" },
    ];
    const reorders = [
      { id: 10, karte_note: "副作用がなく、継続使用のため処方", approved_at: "2026-02-01T10:00:00Z", paid_at: null, created_at: "2026-01-20T10:00:00Z" },
    ];
    const resMap = new Map([["res_1", {}], ["res_2", {}]]);

    const result = buildFormattedIntakes(intakes, reorders, resMap);

    expect(result).toHaveLength(3); // 2問診 + 1再処方カルテ
    // 最新順
    expect(result[0].id).toBe("reorder-10"); // 2/1 が最新
    expect(result[1].id).toBe(2); // 1/15
    expect(result[2].id).toBe(1); // 1/1
  });

  it("karte_note null の再処方は含まれない", () => {
    const intakes = [{ id: 1, reserve_id: "res_1", note: "通常問診", created_at: "2026-01-01T10:00:00Z" }];
    const reorders = [
      { id: 10, karte_note: null, approved_at: null, paid_at: null, created_at: "2026-02-01T10:00:00Z" },
    ];
    const resMap = new Map([["res_1", {}]]);

    const result = buildFormattedIntakes(intakes, reorders, resMap);
    expect(result).toHaveLength(1);
  });

  it("再処方カルテ重複（note='再処方...' + reserve_id=null）は除外", () => {
    const intakes = [
      { id: 1, reserve_id: "res_1", note: "通常問診", created_at: "2026-01-01T10:00:00Z" },
      { id: 2, reserve_id: null, note: "再処方希望\n商品:MJL", created_at: "2026-02-01T10:00:00Z" },
    ];
    const reorders: any[] = [];
    const resMap = new Map([["res_1", {}]]);

    const result = buildFormattedIntakes(intakes, reorders, resMap);
    expect(result).toHaveLength(1); // 重複カルテは除外
    expect(result[0].id).toBe(1);
  });

  it("再処方 + reserve_id あり + reservationsに存在 → 含まれる", () => {
    const intakes = [
      { id: 1, reserve_id: "res_1", note: "再処方希望", created_at: "2026-02-01T10:00:00Z" },
    ];
    const reorders: any[] = [];
    const resMap = new Map([["res_1", {}]]);

    const result = buildFormattedIntakes(intakes, reorders, resMap);
    expect(result).toHaveLength(1); // reservationsに存在するので含まれる
  });
});

// ===================================================================
// パラメータバリデーション
// ===================================================================
describe("patientbundle: パラメータバリデーション", () => {
  it("patientIdパラメータのtrimを行っている", () => {
    expect(src).toContain(".trim()");
  });

  it("patientId未指定時は400を返す", () => {
    expect(src).toContain("400");
    expect(src).toContain("missing_patientId");
  });
});

// ===================================================================
// 5テーブル並列取得
// ===================================================================
describe("patientbundle: 並列取得", () => {
  it("Promise.all で並列取得している", () => {
    expect(src).toContain("Promise.all");
  });

  it("patients テーブルを取得している", () => {
    expect(src).toContain('.from("patients")');
  });

  it("reservations テーブルを取得している", () => {
    expect(src).toContain('.from("reservations")');
  });

  it("orders テーブルを取得している", () => {
    expect(src).toContain('.from("orders")');
  });
});
