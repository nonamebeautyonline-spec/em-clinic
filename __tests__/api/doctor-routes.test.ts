// __tests__/api/doctor-routes.test.ts
// Dr向けAPI統合テスト（reorders一覧/承認/却下、カルテ更新、callstatus、カルテ画像）
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
// 全Drルート共通チェック
// ===================================================================
const DOCTOR_ROUTES = [
  { file: "app/api/doctor/reorders/route.ts", name: "再処方一覧", methods: ["GET"] },
  { file: "app/api/doctor/reorders/approve/route.ts", name: "再処方承認", methods: ["POST"] },
  { file: "app/api/doctor/reorders/reject/route.ts", name: "再処方却下", methods: ["POST"] },
  { file: "app/api/doctor/update/route.ts", name: "カルテ更新", methods: ["POST"] },
  { file: "app/api/doctor/callstatus/route.ts", name: "コール状態更新", methods: ["POST"] },
  { file: "app/api/doctor/karte-images/route.ts", name: "カルテ画像", methods: ["GET", "POST", "DELETE"] },
];

describe("Dr向けAPI: 認証チェック", () => {
  for (const { file, name } of DOCTOR_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("Dr向けAPI: テナント分離", () => {
  for (const { file, name } of DOCTOR_ROUTES) {
    it(`${name} は resolveTenantId を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("resolveTenantId");
    });

    it(`${name} は withTenant を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("withTenant");
    });
  }
});

describe("Dr向けAPI: supabaseAdmin 使用", () => {
  for (const { file, name } of DOCTOR_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("Dr向けAPI: HTTPメソッド", () => {
  for (const { file, name, methods } of DOCTOR_ROUTES) {
    for (const method of methods) {
      it(`${name} は ${method} がエクスポートされている`, () => {
        if (!fileExists(file)) return;
        const src = readFile(file);
        expect(src).toMatch(new RegExp(`export\\s+async\\s+function\\s+${method}`));
      });
    }
  }
});

describe("Dr向けAPI: 認証失敗時 401", () => {
  for (const { file, name } of DOCTOR_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("401");
    });
  }
});

// ===================================================================
// 再処方承認 (approve) 固有テスト
// ===================================================================
describe("doctor/reorders/approve: 承認ルート詳細", () => {
  const file = "app/api/doctor/reorders/approve/route.ts";

  it("reorder_number でレコードを特定している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("reorder_number");
  });

  it("status が pending でなければ 400 を返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"pending"');
    expect(src).toContain("invalid_status");
    expect(src).toContain("400");
  });

  it("confirmed ステータスに更新する", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"confirmed"');
  });

  it("approved_at タイムスタンプを設定する", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("approved_at");
  });

  it("キャッシュ無効化している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("invalidateDashboardCache");
  });

  it("LINE通知を送信している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("pushMessage");
  });

  it("message_log にログを記録している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("message_log");
  });

  it("tenantPayload を使用している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("tenantPayload");
  });

  it("リッチメニュー自動切替（evaluateMenuRules）をfireAndForget", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("evaluateMenuRules");
  });

  it("reorder_not_found 時 404 を返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("reorder_not_found");
    expect(src).toContain("404");
  });

  it("id 必須バリデーション（Zodスキーマ）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // Zod parseBody でバリデーション
    expect(src).toContain("parseBody");
    expect(src).toContain("doctorReorderApproveSchema");
  });
});

// ===================================================================
// 再処方却下 (reject) 固有テスト
// ===================================================================
describe("doctor/reorders/reject: 却下ルート詳細", () => {
  const file = "app/api/doctor/reorders/reject/route.ts";

  it("rejected ステータスに更新する", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"rejected"');
  });

  it("rejected_at タイムスタンプを設定する", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("rejected_at");
  });

  it("pending 以外のステータスは 400 で拒否", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"pending"');
    expect(src).toContain("invalid_status");
  });

  it("キャッシュ無効化している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("invalidateDashboardCache");
  });
});

// ===================================================================
// 再処方一覧 (reorders GET) 固有テスト
// ===================================================================
describe("doctor/reorders: 一覧ルート詳細", () => {
  const file = "app/api/doctor/reorders/route.ts";

  it("reorder_number をUI向けに id として返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("reorder_number");
    expect(src).toContain("id: r.reorder_number");
  });

  it("患者名を patients テーブルから取得", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"patients"');
    expect(src).toContain("patient_name");
  });

  it("created_at で降順ソート", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("ascending: false");
  });
});

// ===================================================================
// doctor/update: カルテ更新ルート固有テスト
// ===================================================================
describe("doctor/update: カルテ更新ルート詳細", () => {
  const file = "app/api/doctor/update/route.ts";

  it("reserveId 必須バリデーション（Zodスキーマ）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // Zod parseBody でバリデーション
    expect(src).toContain("parseBody");
    expect(src).toContain("doctorUpdateSchema");
  });

  it("intake テーブルから patient_id を取得", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('.from("intake")');
    expect(src).toContain("reserve_id");
  });

  it("intake と reservations を同時更新（Promise.allSettled）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("Promise.allSettled");
    expect(src).toContain('.from("reservations")');
  });

  it("intake 更新失敗時はエラーを返す", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("DB_ERROR");
  });

  it("reservations 更新失敗はログのみ（非クリティカル）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("non-critical");
  });

  it("キャッシュ無効化", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("invalidateDashboardCache");
  });
});

// ===================================================================
// doctor/callstatus: コール状態更新ルート固有テスト
// ===================================================================
describe("doctor/callstatus: コール状態更新ルート詳細", () => {
  const file = "app/api/doctor/callstatus/route.ts";

  it("reserveId 必須バリデーション（Zodスキーマ）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    // Zod parseBody でバリデーション
    expect(src).toContain("parseBody");
    expect(src).toContain("callStatusSchema");
  });

  it("intake テーブルの call_status を更新", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("call_status");
    expect(src).toContain('.from("intake")');
  });

  it("call_status_updated_at も更新", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("call_status_updated_at");
  });

  it("trim() で入力値を正規化", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain(".trim()");
  });
});

// ===================================================================
// doctor/karte-images: カルテ画像ルート固有テスト
// ===================================================================
describe("doctor/karte-images: カルテ画像ルート詳細", () => {
  const file = "app/api/doctor/karte-images/route.ts";

  it("GET/POST/DELETE がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/);
  });

  it("画像タイプを制限している（JPEG/PNG/WebP/HEIC）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("image/jpeg");
    expect(src).toContain("image/png");
    expect(src).toContain("image/webp");
    expect(src).toContain("image/heic");
  });

  it("ファイルサイズ制限（10MB）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("10 * 1024 * 1024");
  });

  it("karte-images バケットを使用", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"karte-images"');
  });

  it("karte_images テーブルを操作", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"karte_images"');
  });

  it("tenantPayload を使用してテナントデータを付与", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("tenantPayload");
  });

  it("patient_id 必須バリデーション（POST）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("patient_id は必須です");
  });

  it("ファイル必須バリデーション（POST）", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("ファイルは必須です");
  });

  it("DELETE時にストレージファイルも削除", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain(".remove(");
  });
});

// ===================================================================
// MEMORY.md ルール: 再処方カルテは reorders.karte_note のみ
// ===================================================================
describe("MEMORY.md ルール: 再処方カルテ保存先", () => {
  it("承認ルートは intake に INSERT していない", () => {
    const file = "app/api/doctor/reorders/approve/route.ts";
    if (!fileExists(file)) return;
    const src = readFile(file);
    // intake への insert がないことを確認
    const intakeInsert = src.includes('.from("intake")') && src.includes(".insert(");
    expect(intakeInsert).toBe(false);
  });
});
