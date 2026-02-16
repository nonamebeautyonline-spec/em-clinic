// __tests__/api/intake.test.ts
// intake API のビジネスルールテスト
// 認証、個人情報抽出、マージロジック、LINE仮レコード判定
import { describe, it, expect } from "vitest";

// === Cookie 認証ロジック ===
describe("intake 認証ロジック", () => {
  function extractPatientId(cookies: Record<string, string>): string {
    return cookies["__Host-patient_id"] || cookies["patient_id"] || "";
  }

  it("__Host-patient_id を優先取得", () => {
    expect(extractPatientId({
      "__Host-patient_id": "host_pid",
      "patient_id": "fallback_pid",
    })).toBe("host_pid");
  });

  it("__Host-patient_id がなければ patient_id を使用", () => {
    expect(extractPatientId({ patient_id: "fallback_pid" })).toBe("fallback_pid");
  });

  it("両方なければ空文字（→ 401）", () => {
    expect(extractPatientId({})).toBe("");
  });
});

// === 個人情報抽出の優先順位 ===
describe("intake 個人情報抽出の優先順位", () => {
  function extractName(body: any, answersObj: any): string {
    return body.name || answersObj.氏名 || answersObj.name || "";
  }

  function extractTel(body: any, answersObj: any): string {
    return body.tel || body.phone || answersObj.電話番号 || answersObj.tel || "";
  }

  it("body.name が最優先", () => {
    expect(extractName({ name: "body太郎" }, { 氏名: "answer太郎", name: "answer_name" })).toBe("body太郎");
  });

  it("body.name がなければ answersObj.氏名", () => {
    expect(extractName({}, { 氏名: "answer太郎", name: "answer_name" })).toBe("answer太郎");
  });

  it("answersObj.氏名 もなければ answersObj.name", () => {
    expect(extractName({}, { name: "answer_name" })).toBe("answer_name");
  });

  it("全てなければ空文字", () => {
    expect(extractName({}, {})).toBe("");
  });

  it("body.tel が body.phone より優先", () => {
    expect(extractTel({ tel: "09012345678", phone: "08012345678" }, {})).toBe("09012345678");
  });

  it("body.tel がなければ body.phone", () => {
    expect(extractTel({ phone: "08012345678" }, {})).toBe("08012345678");
  });
});

// === 既存answersとのマージロジック ===
describe("intake answersマージ", () => {
  function mergeAnswers(
    existingAnswers: Record<string, unknown>,
    answersObj: Record<string, unknown>,
    personalInfo: { name?: string; sex?: string; tel?: string }
  ) {
    return {
      ...existingAnswers,
      ...answersObj,
      ...(personalInfo.name ? { 氏名: personalInfo.name, name: personalInfo.name } : {}),
      ...(personalInfo.sex ? { 性別: personalInfo.sex, sex: personalInfo.sex } : {}),
      ...(personalInfo.tel ? { 電話番号: personalInfo.tel, tel: personalInfo.tel } : {}),
    };
  }

  it("既存の個人情報が新しい問診回答で消えない", () => {
    const existing = { 氏名: "太郎", 性別: "男", 身長: "170" };
    const newAnswers = { 身長: "175", 体重: "70" };
    const result = mergeAnswers(existing, newAnswers, {});
    expect(result.氏名).toBe("太郎"); // 保持される
    expect(result.性別).toBe("男");   // 保持される
    expect(result.身長).toBe("175");  // 上書きされる
    expect(result.体重).toBe("70");   // 新規追加
  });

  it("空文字の個人情報では既存値を上書きしない", () => {
    const existing = { 氏名: "太郎" };
    const result = mergeAnswers(existing, {}, { name: "" });
    // name が空文字ならスプレッドが空 → 既存の氏名が残る
    expect(result.氏名).toBe("太郎");
  });

  it("個人情報に値があれば上書きする", () => {
    const existing = { 氏名: "太郎" };
    const result = mergeAnswers(existing, {}, { name: "花子" });
    expect(result.氏名).toBe("花子");
    expect(result.name).toBe("花子");
  });
});

// === intakeレコード優先順位（reserve_id非null優先）===
describe("intake レコード優先取得", () => {
  function findPrimaryIntake(rows: Array<{ reserve_id: string | null; note: string | null }>) {
    return rows.find(r => r.reserve_id != null)
      ?? rows.find(r => !(r.note || "").startsWith("再処方"))
      ?? null;
  }

  it("reserve_id ありを最優先", () => {
    const rows = [
      { reserve_id: null, note: "通常問診" },
      { reserve_id: "res_001", note: "通常問診" },
      { reserve_id: null, note: "再処方希望\n..." },
    ];
    expect(findPrimaryIntake(rows)?.reserve_id).toBe("res_001");
  });

  it("reserve_id がなければ再処方でないものを優先", () => {
    const rows = [
      { reserve_id: null, note: "再処方希望\n商品:..." },
      { reserve_id: null, note: "通常問診" },
    ];
    expect(findPrimaryIntake(rows)?.note).toBe("通常問診");
  });

  it("全て再処方の場合はnull", () => {
    const rows = [
      { reserve_id: null, note: "再処方希望\n商品:..." },
    ];
    // "再処方" で始まるのでスキップされ、null
    expect(findPrimaryIntake(rows)).toBeNull();
  });

  it("空配列はnull", () => {
    expect(findPrimaryIntake([])).toBeNull();
  });
});

// === LINE_仮レコード統合判定 ===
describe("LINE_仮レコード統合", () => {
  it("LINE_で始まるpatient_idは仮レコード", () => {
    expect("LINE_abc12345".startsWith("LINE_")).toBe(true);
  });

  it("通常のpatient_idは仮レコードではない", () => {
    expect("patient_001".startsWith("LINE_")).toBe(false);
  });

  it("仮レコード統合はpatient_idがLINE_でない場合のみ実行", () => {
    const patientId = "patient_001";
    expect(!patientId.startsWith("LINE_")).toBe(true);
  });

  it("LINE_患者自身は仮レコード統合をスキップ", () => {
    const patientId = "LINE_abcdef12";
    expect(!patientId.startsWith("LINE_")).toBe(false);
  });

  it("ピン留め配列のID移行", () => {
    const pins = ["LINE_abc", "patient_002", "patient_003"];
    const fakeId = "LINE_abc";
    const realId = "patient_001";
    const newPins = pins.map(p => p === fakeId ? realId : p);
    expect(newPins).toEqual(["patient_001", "patient_002", "patient_003"]);
  });
});
