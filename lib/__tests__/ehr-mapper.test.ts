// lib/__tests__/ehr-mapper.test.ts — EHRフィールドマッピング変換テスト

import {
  toEhrPatient,
  fromEhrPatient,
  toEhrKarte,
  fromEhrKarte,
  ehrPatientToCsvRow,
  csvRowToEhrPatient,
  ehrKarteToCsvRow,
  csvRowToEhrKarte,
  PATIENT_CSV_HEADERS,
  KARTE_CSV_HEADERS,
} from "@/lib/ehr/mapper";
import type { EhrPatient, EhrKarte } from "@/lib/ehr/types";

// ============================================================
// toEhrPatient
// ============================================================

describe("toEhrPatient", () => {
  it("全フィールドが正しくマッピングされる", () => {
    const patient = {
      patient_id: "P001",
      name: "田中太郎",
      name_kana: "タナカタロウ",
      sex: "男性",
      birthday: "1990-01-01",
      tel: "09012345678",
    };
    const result = toEhrPatient(patient);
    expect(result.externalId).toBe("P001");
    expect(result.name).toBe("田中太郎");
    expect(result.nameKana).toBe("タナカタロウ");
    expect(result.sex).toBe("男性");
    expect(result.birthday).toBe("1990-01-01");
    expect(result.tel).toBe("09012345678");
  });

  it("name が null の場合は空文字列", () => {
    const patient = { patient_id: "P001", name: null };
    const result = toEhrPatient(patient);
    expect(result.name).toBe("");
  });

  it("intake.answers から補完情報を取得", () => {
    const patient = { patient_id: "P001", name: "田中太郎" };
    const intake = {
      id: 1,
      patient_id: "P001",
      answers: {
        "氏名カナ": "タナカタロウ",
        "性別": "男性",
        "生年月日": "1990-01-01",
        "郵便番号": "100-0001",
        "住所": "東京都千代田区",
      },
    };
    const result = toEhrPatient(patient, intake);
    expect(result.nameKana).toBe("タナカタロウ");
    expect(result.sex).toBe("男性");
    expect(result.birthday).toBe("1990-01-01");
    expect(result.postalCode).toBe("100-0001");
    expect(result.address).toBe("東京都千代田区");
  });

  it("patient の値が intake.answers より優先される", () => {
    const patient = {
      patient_id: "P001",
      name: "田中太郎",
      name_kana: "タナカタロウ",
      sex: "男性",
    };
    const intake = {
      id: 1,
      patient_id: "P001",
      answers: { "氏名カナ": "ヤマダハナコ", "性別": "女性" },
    };
    const result = toEhrPatient(patient, intake);
    expect(result.nameKana).toBe("タナカタロウ"); // patient優先
    expect(result.sex).toBe("男性"); // patient優先
  });

  it("intake が null の場合でもエラーにならない", () => {
    const patient = { patient_id: "P001", name: "田中太郎" };
    const result = toEhrPatient(patient, null);
    expect(result.externalId).toBe("P001");
    expect(result.nameKana).toBeUndefined();
  });
});

// ============================================================
// fromEhrPatient
// ============================================================

describe("fromEhrPatient", () => {
  it("全フィールドが正しく変換される", () => {
    const ehr: EhrPatient = {
      externalId: "P001",
      name: "田中太郎",
      nameKana: "タナカタロウ",
      sex: "男性",
      birthday: "1990-01-01",
      tel: "09012345678",
    };
    const result = fromEhrPatient(ehr);
    expect(result.name).toBe("田中太郎");
    expect(result.name_kana).toBe("タナカタロウ");
    expect(result.sex).toBe("男性");
    expect(result.birthday).toBe("1990-01-01");
  });

  it("電話番号が normalizeJPPhone で正規化される", () => {
    const ehr: EhrPatient = {
      externalId: "P001",
      name: "田中太郎",
      tel: "0090-1234-5678",
    };
    const result = fromEhrPatient(ehr);
    expect(result.tel).toBe("09012345678");
  });

  it("未設定フィールドは update に含まれない", () => {
    const ehr: EhrPatient = {
      externalId: "P001",
      name: "田中太郎",
    };
    const result = fromEhrPatient(ehr);
    expect(result.name).toBe("田中太郎");
    expect(result).not.toHaveProperty("name_kana");
    expect(result).not.toHaveProperty("sex");
    expect(result).not.toHaveProperty("birthday");
    expect(result).not.toHaveProperty("tel");
  });
});

// ============================================================
// toEhrKarte / fromEhrKarte
// ============================================================

describe("toEhrKarte", () => {
  it("正常変換", () => {
    const intake = {
      id: 42,
      patient_id: "P001",
      note: "SOAP カルテ内容",
      created_at: "2025-06-15T10:30:00Z",
    };
    const patient = { patient_id: "P001", name: "田中太郎" };
    const result = toEhrKarte(intake, patient);
    expect(result.externalId).toBe("42");
    expect(result.patientExternalId).toBe("P001");
    expect(result.date).toBe("2025-06-15");
    expect(result.content).toBe("SOAP カルテ内容");
  });

  it("note が null の場合は空文字列", () => {
    const intake = { id: 1, patient_id: "P001", note: null };
    const patient = { patient_id: "P001", name: "田中" };
    const result = toEhrKarte(intake, patient);
    expect(result.content).toBe("");
  });

  it("created_at が null の場合は今日の日付", () => {
    const intake = { id: 1, patient_id: "P001", created_at: null };
    const patient = { patient_id: "P001", name: "田中" };
    const result = toEhrKarte(intake, patient);
    expect(result.date).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("fromEhrKarte", () => {
  it("content のみ → note にそのまま", () => {
    const karte: EhrKarte = {
      patientExternalId: "P001",
      date: "2025-06-15",
      content: "診察内容",
    };
    const result = fromEhrKarte(karte);
    expect(result.note).toBe("診察内容");
  });

  it("diagnosis + prescription が付加される", () => {
    const karte: EhrKarte = {
      patientExternalId: "P001",
      date: "2025-06-15",
      content: "主訴: 頭痛",
      diagnosis: "片頭痛",
      prescription: "ロキソニン 60mg 3T",
    };
    const result = fromEhrKarte(karte);
    expect(result.note).toContain("主訴: 頭痛");
    expect(result.note).toContain("【傷病名】片頭痛");
    expect(result.note).toContain("【処方】ロキソニン 60mg 3T");
  });

  it("content が空で diagnosis のみ", () => {
    const karte: EhrKarte = {
      patientExternalId: "P001",
      date: "2025-06-15",
      content: "",
      diagnosis: "感冒",
    };
    const result = fromEhrKarte(karte);
    expect(result.note).toBe("【傷病名】感冒");
  });
});

// ============================================================
// CSV変換
// ============================================================

describe("PATIENT_CSV_HEADERS / KARTE_CSV_HEADERS", () => {
  it("患者CSVヘッダーは8項目", () => {
    expect(PATIENT_CSV_HEADERS).toHaveLength(8);
    expect(PATIENT_CSV_HEADERS[0]).toBe("患者ID");
  });

  it("カルテCSVヘッダーは5項目", () => {
    expect(KARTE_CSV_HEADERS).toHaveLength(5);
    expect(KARTE_CSV_HEADERS[0]).toBe("患者ID");
  });
});

describe("ehrPatientToCsvRow", () => {
  it("全フィールドが正しい順序でCSV行に変換される", () => {
    const p: EhrPatient = {
      externalId: "P001",
      name: "田中太郎",
      nameKana: "タナカタロウ",
      sex: "男性",
      birthday: "1990-01-01",
      tel: "09012345678",
      postalCode: "100-0001",
      address: "東京都千代田区",
    };
    const row = ehrPatientToCsvRow(p);
    expect(row).toEqual([
      "P001", "田中太郎", "タナカタロウ", "男性",
      "1990-01-01", "09012345678", "100-0001", "東京都千代田区",
    ]);
  });

  it("未設定フィールドは空文字列", () => {
    const p: EhrPatient = { externalId: "P001", name: "田中太郎" };
    const row = ehrPatientToCsvRow(p);
    expect(row[2]).toBe(""); // nameKana
    expect(row[3]).toBe(""); // sex
  });
});

describe("csvRowToEhrPatient", () => {
  it("正常なCSV行 → EhrPatient", () => {
    const row = ["P001", "田中太郎", "タナカタロウ", "男性", "1990-01-01", "09012345678", "100-0001", "東京都千代田区"];
    const result = csvRowToEhrPatient(row);
    expect(result).not.toBeNull();
    expect(result!.externalId).toBe("P001");
    expect(result!.name).toBe("田中太郎");
    expect(result!.tel).toBe("09012345678");
  });

  it("行が短すぎる（2列未満） → null", () => {
    expect(csvRowToEhrPatient(["P001"])).toBeNull();
    expect(csvRowToEhrPatient([])).toBeNull();
  });

  it("電話番号が normalizeJPPhone で正規化される", () => {
    const row = ["P001", "田中", "", "", "", "0090-1234-5678"];
    const result = csvRowToEhrPatient(row);
    expect(result!.tel).toBe("09012345678");
  });

  it("空文字列フィールドは undefined になる", () => {
    const row = ["P001", "田中", "", "", ""];
    const result = csvRowToEhrPatient(row);
    expect(result!.nameKana).toBeUndefined();
    expect(result!.sex).toBeUndefined();
  });
});

describe("ehrKarteToCsvRow", () => {
  it("正常変換", () => {
    const k: EhrKarte = {
      patientExternalId: "P001",
      date: "2025-06-15",
      content: "診察内容",
      diagnosis: "感冒",
      prescription: "薬A",
    };
    const row = ehrKarteToCsvRow(k);
    expect(row).toEqual(["P001", "2025-06-15", "診察内容", "感冒", "薬A"]);
  });
});

describe("csvRowToEhrKarte", () => {
  it("正常なCSV行 → EhrKarte", () => {
    const row = ["P001", "2025-06-15", "診察内容", "感冒", "薬A"];
    const result = csvRowToEhrKarte(row);
    expect(result).not.toBeNull();
    expect(result!.patientExternalId).toBe("P001");
    expect(result!.content).toBe("診察内容");
    expect(result!.diagnosis).toBe("感冒");
  });

  it("行が短すぎる（3列未満） → null", () => {
    expect(csvRowToEhrKarte(["P001", "2025-06-15"])).toBeNull();
    expect(csvRowToEhrKarte([])).toBeNull();
  });

  it("diagnosis/prescription が空 → undefined", () => {
    const row = ["P001", "2025-06-15", "内容", "", ""];
    const result = csvRowToEhrKarte(row);
    expect(result!.diagnosis).toBeUndefined();
    expect(result!.prescription).toBeUndefined();
  });
});

// ============================================================
// ラウンドトリップ検証
// ============================================================

describe("ラウンドトリップ", () => {
  it("EhrPatient → CSV行 → EhrPatient で元に戻る", () => {
    const original: EhrPatient = {
      externalId: "P001",
      name: "田中太郎",
      nameKana: "タナカタロウ",
      sex: "男性",
      birthday: "1990-01-01",
      tel: "09012345678",
      postalCode: "100-0001",
      address: "東京都千代田区",
    };
    const row = ehrPatientToCsvRow(original);
    const restored = csvRowToEhrPatient(row);
    expect(restored).toEqual(original);
  });

  it("EhrKarte → CSV行 → EhrKarte で元に戻る", () => {
    const original: EhrKarte = {
      patientExternalId: "P001",
      date: "2025-06-15",
      content: "診察内容",
      diagnosis: "感冒",
      prescription: "薬A",
    };
    const row = ehrKarteToCsvRow(original);
    const restored = csvRowToEhrKarte(row);
    expect(restored).toEqual(original);
  });
});
