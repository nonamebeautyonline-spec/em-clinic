// __tests__/api/merge-patients.test.ts
// 患者統合APIテスト（patient_id マージ・answerers統合・deleteNewIntake）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

// withTenant はクエリをそのまま返す（テナントフィルタ無効化）
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue(null),
  withTenant: vi.fn((query: any) => query),
}));

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

// Supabase モック: チェーンビルダー
type MockResult = { data?: any; error?: any; count?: number | null };
let mockResults: Record<string, MockResult> = {};
let updateCalls: { table: string; data: any; eq: [string, any] }[] = [];
let deleteCalls: { table: string; eq: [string, any] }[] = [];
let selectCalls: { table: string; eq: [string, any] }[] = [];

function createChain(table: string) {
  let eqKey = "";
  let eqVal: any;
  const chain: any = {
    update: (data: any) => {
      const inner: any = {
        eq: (key: string, val: any) => {
          updateCalls.push({ table, data, eq: [key, val] });
          return mockResults[`update:${table}`] ?? { error: null, count: 0 };
        },
      };
      return inner;
    },
    delete: () => {
      const inner: any = {
        eq: (key: string, val: any) => {
          deleteCalls.push({ table, eq: [key, val] });
          return mockResults[`delete:${table}`] ?? { error: null };
        },
      };
      return inner;
    },
    select: (_cols?: string) => {
      const inner: any = {
        eq: (key: string, val: any) => {
          eqKey = key;
          eqVal = val;
          selectCalls.push({ table, eq: [key, val] });
          const result = mockResults[`select:${table}:${val}`];
          return {
            maybeSingle: () => result ?? { data: null },
          };
        },
      };
      return inner;
    },
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => createChain(table),
  },
}));

// --- ルートインポート ---
import { POST } from "@/app/api/admin/merge-patients/route";

function makeRequest(body: any): any {
  return {
    json: async () => body,
    headers: new Headers(),
  } as any;
}

// --- テスト本体 ---
describe("merge-patients API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized = true;
    mockResults = {};
    updateCalls = [];
    deleteCalls = [];
    selectCalls = [];
  });

  // テスト用の有効な patient_id（数字11桁形式）
  const OLD_PID = "10000000001";
  const NEW_PID = "10000000002";

  // 1. 正常統合
  it("正常統合 → {ok:true, results} を返す", async () => {
    // answerers: 統合元あり・統合先なし → 移行パターン
    mockResults[`select:patients:${OLD_PID}`] = { data: { line_id: "L1", name: "太郎", name_kana: "タロウ", tel: "090", sex: "M", birthday: "2000-01-01" } };
    mockResults[`select:patients:${NEW_PID}`] = { data: null };

    const res = await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.results).toBeDefined();
  });

  // 2. old_patient_id 未指定 → 400
  it("old_patient_id 未指定 → 400", async () => {
    const res = await POST(makeRequest({ new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    // Zodバリデーションエラー（details にフィールド名が含まれる）
    expect(json.error).toBe("入力値が不正です");
    expect(json.details.some((d: string) => d.includes("old_patient_id"))).toBe(true);
  });

  // 3. new_patient_id 未指定 → 400
  it("new_patient_id 未指定 → 400", async () => {
    const res = await POST(makeRequest({ old_patient_id: OLD_PID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    // Zodバリデーションエラー（details にフィールド名が含まれる）
    expect(json.error).toBe("入力値が不正です");
    expect(json.details.some((d: string) => d.includes("new_patient_id"))).toBe(true);
  });

  // 4. old === new → 400
  it("old_patient_id === new_patient_id → 400", async () => {
    const SAME_PID = "10000000099";
    const res = await POST(makeRequest({ old_patient_id: SAME_PID, new_patient_id: SAME_PID }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("different");
  });

  // 5. 認証NG → 401
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;

    const res = await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("unauthorized");
  });

  // 6. 全MERGE_TABLESの更新確認
  it("全MERGE_TABLES（8テーブル）のpatient_id更新が呼ばれる", async () => {
    mockResults[`select:patients:${OLD_PID}`] = { data: null };

    const res = await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // 8テーブル全てに update が発行されるはず
    const expectedTables = ["intake", "orders", "reservations", "reorders", "message_log", "patient_tags", "patient_marks", "friend_field_values"];
    const updatedTables = updateCalls
      .filter(c => c.data.patient_id === NEW_PID && c.eq[0] === "patient_id" && c.eq[1] === OLD_PID)
      .map(c => c.table);

    for (const t of expectedTables) {
      expect(updatedTables).toContain(t);
    }
    expect(updatedTables.length).toBe(8);
  });

  // 7. answerers統合: 統合先あり → 空フィールド補完
  it("answerers統合: 統合先が存在する場合、空フィールドを統合元で補完", async () => {
    mockResults[`select:patients:${OLD_PID}`] = {
      data: { line_id: "L_old", name: "旧太郎", name_kana: "キュウタロウ", tel: "090-0000-0000", sex: "M", birthday: "1990-01-01" },
    };
    mockResults[`select:patients:${NEW_PID}`] = {
      data: { line_id: "", name: "新太郎", name_kana: "", tel: "", sex: "", birthday: "" },
    };

    await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));

    // patients テーブルへの update を確認（answerers統合）
    const patientsUpdates = updateCalls.filter(c => c.table === "patients" && c.eq[1] === NEW_PID);
    expect(patientsUpdates.length).toBeGreaterThanOrEqual(1);

    const mergedData = patientsUpdates[0].data;
    // 統合先に値がある name は統合先の値が維持される
    expect(mergedData.name).toBe("新太郎");
    // 統合先が空の line_id は統合元の値で補完される
    expect(mergedData.line_id).toBe("L_old");
    expect(mergedData.name_kana).toBe("キュウタロウ");
  });

  // 8. answerers統合: 統合先なし → patient_id更新で移行
  it("answerers統合: 統合先が存在しない場合、統合元のpatient_idを更新して移行", async () => {
    mockResults[`select:patients:${OLD_PID}`] = {
      data: { line_id: "L_old", name: "旧太郎", name_kana: "キュウタロウ", tel: "090", sex: "M", birthday: "1990-01-01" },
    };
    mockResults[`select:patients:${NEW_PID}`] = { data: null };

    await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));

    // patients テーブルへの update: patient_id を old → new に変更
    const moveUpdate = updateCalls.find(
      c => c.table === "patients" && c.data.patient_id === NEW_PID && c.eq[1] === OLD_PID
    );
    expect(moveUpdate).toBeDefined();
  });

  // 9. deleteNewIntake: 統合先データ先削除
  it("delete_new_intake=true の場合、統合先のintake/reservations/patientsが先に削除される", async () => {
    mockResults[`select:patients:${OLD_PID}`] = { data: null };

    await POST(makeRequest({
      old_patient_id: OLD_PID,
      new_patient_id: NEW_PID,
      delete_new_intake: true,
    }));

    // intake, reservations, patients の3テーブルで NEW_PID を削除
    const deletedTables = deleteCalls
      .filter(c => c.eq[0] === "patient_id" && c.eq[1] === NEW_PID)
      .map(c => c.table);

    expect(deletedTables).toContain("intake");
    expect(deletedTables).toContain("reservations");
    expect(deletedTables).toContain("patients");
  });

  // 10. DBエラー → results内にerror記録（全体はok:true）
  it("テーブル更新でDBエラー発生 → results内にerror記録、全体はok:true", async () => {
    mockResults["update:orders"] = { error: { message: "DB connection failed" }, count: null };
    mockResults[`select:patients:${OLD_PID}`] = { data: null };

    const res = await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.results.orders).toContain("error");
  });

  // 11. 統合元answerer削除確認
  it("answerers統合後、統合元のanswerersが削除される", async () => {
    mockResults[`select:patients:${OLD_PID}`] = {
      data: { line_id: "L_old", name: "旧太郎", name_kana: "", tel: "", sex: "", birthday: "" },
    };
    mockResults[`select:patients:${NEW_PID}`] = {
      data: { line_id: "", name: "新太郎", name_kana: "", tel: "", sex: "", birthday: "" },
    };

    await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));

    // 統合元 (OLD_PID) の patients 削除を確認
    const deleteOld = deleteCalls.find(
      c => c.table === "patients" && c.eq[0] === "patient_id" && c.eq[1] === OLD_PID
    );
    expect(deleteOld).toBeDefined();
  });

  // 12. 例外発生 → 500
  it("予期せぬ例外 → 500", async () => {
    // json()でエラーを起こして catch ブロックに入れる
    const badReq = {
      json: async () => { throw new Error("parse error"); },
      headers: new Headers(),
    } as any;

    // ただし route.ts は req.json().catch(() => ({})) でキャッチするため、
    // verifyAdminAuth を例外送出に変更
    const { verifyAdminAuth } = await import("@/lib/admin-auth");
    (verifyAdminAuth as any).mockRejectedValueOnce(new Error("unexpected"));

    const res = await POST(makeRequest({ old_patient_id: OLD_PID, new_patient_id: NEW_PID }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("server_error");
  });
});
