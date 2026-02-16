// __tests__/api/pid-generation.test.ts
// 患者ID（PID）生成・重複排除・LINE_仮レコード管理のテスト
import { describe, it, expect } from "vitest";

// === LINE_ PID 生成ロジック ===
describe("PID生成: LINE_プレフィックス方式", () => {
  function generateLinePid(lineUid: string): string {
    return `LINE_${lineUid.slice(-8)}`;
  }

  it("LINE UID末尾8文字でPID生成", () => {
    const lineUid = "Uf1234567890abcdef1234567890abcdef";
    const pid = generateLinePid(lineUid);
    expect(pid).toBe("LINE_90abcdef");
    expect(pid.startsWith("LINE_")).toBe(true);
  });

  it("短いUID（8文字以下）はそのまま使用", () => {
    const lineUid = "abc12345";
    const pid = generateLinePid(lineUid);
    expect(pid).toBe("LINE_abc12345");
  });

  it("異なるUIDは異なるPIDを生成", () => {
    const pid1 = generateLinePid("Uf1111111111111111111111111111aaaa");
    const pid2 = generateLinePid("Uf2222222222222222222222222222bbbb");
    expect(pid1).not.toBe(pid2);
  });

  it("PIDの形式: LINE_ + 8文字", () => {
    const lineUid = "Uf1234567890abcdef1234567890abcdef";
    const pid = generateLinePid(lineUid);
    // LINE_ (5文字) + 末尾8文字 = 13文字
    expect(pid.length).toBe(13);
  });
});

// === LINE_ PID コリジョン検知 ===
describe("PID コリジョン検知", () => {
  it("末尾8文字が同じUIDは同じPIDになる（コリジョン）", () => {
    // 異なるUIDでも末尾8文字が同じなら同じPID
    const uid1 = "Uf1111111111111111111111111111abcd1234";
    const uid2 = "Uf2222222222222222222222222222abcd1234";
    const pid1 = `LINE_${uid1.slice(-8)}`;
    const pid2 = `LINE_${uid2.slice(-8)}`;
    expect(pid1).toBe(pid2); // コリジョン！
  });

  it("コリジョン防止: 既存PIDチェック", () => {
    const existingPids = new Set(["LINE_abcd1234", "LINE_efgh5678"]);
    const newPid = "LINE_abcd1234";
    const isDuplicate = existingPids.has(newPid);
    expect(isDuplicate).toBe(true);
  });

  it("新規PIDは重複なし", () => {
    const existingPids = new Set(["LINE_abcd1234", "LINE_efgh5678"]);
    const newPid = "LINE_ijkl9012";
    const isDuplicate = existingPids.has(newPid);
    expect(isDuplicate).toBe(false);
  });
});

// === LINE_ 仮レコード判定 ===
describe("PID LINE_仮レコード判定", () => {
  it("LINE_で始まるPIDは仮レコード", () => {
    expect("LINE_abc12345".startsWith("LINE_")).toBe(true);
  });

  it("通常のPIDは仮レコードではない", () => {
    expect("patient_001".startsWith("LINE_")).toBe(false);
  });

  it("UUID形式のPIDは仮レコードではない", () => {
    expect("550e8400-e29b-41d4-a716-446655440000".startsWith("LINE_")).toBe(false);
  });

  it("空文字は仮レコードではない", () => {
    expect("".startsWith("LINE_")).toBe(false);
  });
});

// === 正規患者の優先選択 ===
describe("PID 正規患者の優先選択", () => {
  interface PatientRecord {
    patient_id: string;
    name: string;
  }

  function selectProperPatient(patients: PatientRecord[]): PatientRecord | null {
    if (patients.length === 0) return null;
    // 正規患者（LINE_ 以外）を優先
    const proper = patients.find(p => !p.patient_id.startsWith("LINE_"));
    return proper || patients[0];
  }

  it("正規患者と仮レコード混在 → 正規を選択", () => {
    const patients = [
      { patient_id: "LINE_abc12345", name: "テスト" },
      { patient_id: "patient_001", name: "田中太郎" },
    ];
    const selected = selectProperPatient(patients);
    expect(selected?.patient_id).toBe("patient_001");
  });

  it("仮レコードのみ → 仮レコードを返す", () => {
    const patients = [
      { patient_id: "LINE_abc12345", name: "LINEユーザー" },
    ];
    const selected = selectProperPatient(patients);
    expect(selected?.patient_id).toBe("LINE_abc12345");
  });

  it("正規患者のみ → 正規を返す", () => {
    const patients = [
      { patient_id: "patient_001", name: "田中太郎" },
    ];
    const selected = selectProperPatient(patients);
    expect(selected?.patient_id).toBe("patient_001");
  });

  it("空配列 → null", () => {
    expect(selectProperPatient([])).toBeNull();
  });

  it("複数の正規患者 → 最初を選択", () => {
    const patients = [
      { patient_id: "patient_001", name: "田中太郎" },
      { patient_id: "patient_002", name: "山田花子" },
    ];
    const selected = selectProperPatient(patients);
    expect(selected?.patient_id).toBe("patient_001");
  });
});

// === LINE_ 仮レコード統合（ID置換）===
describe("PID 仮レコード統合", () => {
  it("ピン留め配列のID移行", () => {
    const pins = ["LINE_abc", "patient_002", "patient_003"];
    const fakeId = "LINE_abc";
    const realId = "patient_001";
    const newPins = pins.map(p => p === fakeId ? realId : p);
    expect(newPins).toEqual(["patient_001", "patient_002", "patient_003"]);
  });

  it("存在しないfakeIdでは変更なし", () => {
    const pins = ["patient_001", "patient_002"];
    const fakeId = "LINE_xyz";
    const realId = "patient_003";
    const newPins = pins.map(p => p === fakeId ? realId : p);
    expect(newPins).toEqual(["patient_001", "patient_002"]);
  });

  it("複数のLINE_レコードを持つ場合", () => {
    const patients = [
      { patient_id: "LINE_aaa11111" },
      { patient_id: "LINE_bbb22222" },
      { patient_id: "patient_001" },
    ];
    const fakes = patients.filter(p => p.patient_id.startsWith("LINE_"));
    expect(fakes.length).toBe(2);
    const proper = patients.find(p => !p.patient_id.startsWith("LINE_"));
    expect(proper?.patient_id).toBe("patient_001");
  });
});

// === displayName のフォールバック ===
describe("PID displayName フォールバック", () => {
  it("LINEプロフィール名がある場合はそれを使用", () => {
    const displayName = "田中太郎";
    const lineUid = "Uf1234567890abcdef";
    const name = displayName || `LINE_${lineUid.slice(-6)}`;
    expect(name).toBe("田中太郎");
  });

  it("LINEプロフィール名が空の場合はUID末尾で代替", () => {
    const displayName = "";
    const lineUid = "Uf1234567890abcdef";
    const name = displayName || `LINE_${lineUid.slice(-6)}`;
    expect(name).toBe("LINE_abcdef");
  });
});
