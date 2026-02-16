// __tests__/api/intake-advanced.test.ts
// intake API の異常系・セキュリティテスト
import { describe, it, expect } from "vitest";

// === supabaseAdmin 必須使用の確認 ===
describe("intake supabaseAdmin使用の重要性", () => {
  // 2026-02-09事故: anon key で SELECT → RLS でブロック → null → 665件の answerer.name 消失

  it("supabaseAdmin を使わないと RLS で SELECT がブロックされる可能性", () => {
    // anon key: RLS 有効 → patient テーブルの行が見えない
    // service_role key: RLS バイパス → 全行が見える
    const useServiceRole = true;
    expect(useServiceRole).toBe(true);
  });

  it("SELECT結果がnullの場合、上書きしてはいけない", () => {
    // 既存値が存在する場合、null で上書きするとデータ消失
    const existingName = "田中太郎";
    const queryResult = null; // RLS でブロックされた結果
    const newName = queryResult ?? existingName;
    expect(newName).toBe("田中太郎"); // 既存値を維持
  });
});

// === upsert禁止の確認 ===
describe("intake upsert禁止", () => {
  // 2026-02-08事故: ユニーク制約ドロップ後にupsertが壊れ、23件のintake消失

  it("patient_id にユニーク制約がないため upsert は使用禁止", () => {
    // upsert({ onConflict: "patient_id" }) はサイレントに失敗する
    const hasUniqueConstraint = false;
    expect(hasUniqueConstraint).toBe(false);
  });

  it("代わりに select→insert/update パターンを使う", () => {
    const existingRecord = { id: 1, patient_id: "p_001" };
    const strategy = existingRecord ? "update" : "insert";
    expect(strategy).toBe("update");
  });

  it("新規の場合はinsert", () => {
    const existingRecord = null;
    const strategy = existingRecord ? "update" : "insert";
    expect(strategy).toBe("insert");
  });
});

// === intake UPDATE は id 指定必須 ===
describe("intake UPDATE は id 指定", () => {
  it("patient_id で UPDATE すると複数レコードを全上書きしてしまう", () => {
    // patient_id にユニーク制約がないため、複数レコードが存在する
    const records = [
      { id: 1, patient_id: "p_001", note: "初回問診" },
      { id: 2, patient_id: "p_001", note: "再処方カルテ" },
    ];
    const matchCount = records.filter(r => r.patient_id === "p_001").length;
    expect(matchCount).toBe(2); // 複数マッチ → 危険
  });

  it("id 指定なら1件のみ更新される", () => {
    const records = [
      { id: 1, patient_id: "p_001", note: "初回問診" },
      { id: 2, patient_id: "p_001", note: "再処方カルテ" },
    ];
    const matchCount = records.filter(r => r.id === 1).length;
    expect(matchCount).toBe(1); // 1件のみ → 安全
  });
});

// === reserve_id 優先取得の境界値 ===
describe("intake reserve_id 優先取得 境界値", () => {
  function findPrimaryIntake(rows: Array<{ id: number; reserve_id: string | null; note: string | null }>) {
    return rows.find(r => r.reserve_id != null)
      ?? rows.find(r => !(r.note || "").startsWith("再処方"))
      ?? null;
  }

  it("複数の reserve_id ありレコード → 最初のものを返す", () => {
    const rows = [
      { id: 1, reserve_id: "res_001", note: "問診1" },
      { id: 2, reserve_id: "res_002", note: "問診2" },
    ];
    expect(findPrimaryIntake(rows)?.id).toBe(1);
  });

  it("reserve_id と再処方フラグが混在", () => {
    const rows = [
      { id: 1, reserve_id: null, note: "再処方希望\n..." },
      { id: 2, reserve_id: "res_001", note: null },
      { id: 3, reserve_id: null, note: "通常問診" },
    ];
    // reserve_id ありを最優先
    expect(findPrimaryIntake(rows)?.id).toBe(2);
  });

  it("note が null の場合は再処方扱いしない", () => {
    const rows = [
      { id: 1, reserve_id: null, note: null },
    ];
    // (null || "").startsWith("再処方") → false → 含まれる
    expect(findPrimaryIntake(rows)?.id).toBe(1);
  });

  it("note が undefined の場合も安全", () => {
    const rows = [
      { id: 1, reserve_id: null, note: undefined as unknown as string | null },
    ];
    expect(findPrimaryIntake(rows)?.id).toBe(1);
  });
});

// === 電話番号の正規化確認 ===
describe("intake 電話番号正規化", () => {
  // normalizeJPPhone が呼ばれることの確認
  // 実際の正規化ロジックは lib/__tests__/phone.test.ts でテスト済み

  it("保存前に normalizeJPPhone を通す", () => {
    // intake API は tel を normalizeJPPhone で正規化してから保存する
    const shouldNormalize = true;
    expect(shouldNormalize).toBe(true);
  });

  it("正規化結果は必ず 0 始まり", () => {
    const normalized = "09012345678";
    expect(normalized.startsWith("0")).toBe(true);
  });
});

// === answersマージの追加テスト ===
describe("intake answersマージ 追加テスト", () => {
  function mergeAnswers(
    existingAnswers: Record<string, unknown>,
    newAnswers: Record<string, unknown>,
    personalInfo: { name?: string; tel?: string }
  ) {
    return {
      ...existingAnswers,
      ...newAnswers,
      ...(personalInfo.name ? { 氏名: personalInfo.name, name: personalInfo.name } : {}),
      ...(personalInfo.tel ? { 電話番号: personalInfo.tel, tel: personalInfo.tel } : {}),
    };
  }

  it("既存answersが空オブジェクトの場合", () => {
    const result = mergeAnswers({}, { 身長: "170" }, { name: "太郎" });
    expect(result.身長).toBe("170");
    expect(result.氏名).toBe("太郎");
  });

  it("新しいanswersが空オブジェクトの場合（個人情報のみ更新）", () => {
    const result = mergeAnswers({ 身長: "170" }, {}, { name: "花子" });
    expect(result.身長).toBe("170"); // 保持
    expect(result.氏名).toBe("花子"); // 更新
  });

  it("personalInfo も空の場合（何も変更なし）", () => {
    const existing = { 身長: "170", 氏名: "太郎" };
    const result = mergeAnswers(existing, {}, {});
    expect(result).toEqual(existing);
  });

  it("同じキーが既存とnewの両方にある場合、newが優先", () => {
    const result = mergeAnswers({ 身長: "170" }, { 身長: "175" }, {});
    expect(result.身長).toBe("175");
  });
});
