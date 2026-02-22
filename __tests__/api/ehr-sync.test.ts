// __tests__/api/ehr-sync.test.ts — 電子カルテ連携テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────── モック ────────────────────

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(true),
  getSettingsByCategory: vi.fn().mockResolvedValue([]),
}));

// ──────────────────── mapper テスト ────────────────────

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

describe("EHR mapper", () => {
  describe("toEhrPatient", () => {
    it("patients テーブルのデータを EhrPatient に変換する", () => {
      const patient = {
        patient_id: "P001",
        name: "山田太郎",
        name_kana: "ヤマダタロウ",
        sex: "男",
        birthday: "1990-01-15",
        tel: "09012345678",
      };

      const result = toEhrPatient(patient);

      expect(result.externalId).toBe("P001");
      expect(result.name).toBe("山田太郎");
      expect(result.nameKana).toBe("ヤマダタロウ");
      expect(result.sex).toBe("男");
      expect(result.birthday).toBe("1990-01-15");
      expect(result.tel).toBe("09012345678");
    });

    it("intake の answers から補完情報を取得する", () => {
      const patient = {
        patient_id: "P002",
        name: "鈴木花子",
        name_kana: null,
        sex: null,
        birthday: null,
        tel: null,
      };
      const intake = {
        id: 1,
        patient_id: "P002",
        answers: {
          "氏名カナ": "スズキハナコ",
          "性別": "女",
          "生年月日": "1985-03-20",
          "郵便番号": "1000001",
          "住所": "東京都千代田区",
        },
      };

      const result = toEhrPatient(patient, intake);

      expect(result.nameKana).toBe("スズキハナコ");
      expect(result.sex).toBe("女");
      expect(result.birthday).toBe("1985-03-20");
      expect(result.postalCode).toBe("1000001");
      expect(result.address).toBe("東京都千代田区");
    });

    it("null patient には空文字を返す", () => {
      const result = toEhrPatient({
        patient_id: "P003",
        name: null,
      });
      expect(result.name).toBe("");
    });
  });

  describe("fromEhrPatient", () => {
    it("EhrPatient を patients 更新データに変換する", () => {
      const ehr = {
        externalId: "EXT001",
        name: "田中一郎",
        nameKana: "タナカイチロウ",
        sex: "男",
        birthday: "1980-06-10",
        tel: "08012345678",
      };

      const result = fromEhrPatient(ehr);

      expect(result.name).toBe("田中一郎");
      expect(result.name_kana).toBe("タナカイチロウ");
      expect(result.sex).toBe("男");
      expect(result.birthday).toBe("1980-06-10");
      expect(result.tel).toBe("08012345678");
    });

    it("電話番号を normalizeJPPhone で正規化する", () => {
      const ehr = {
        externalId: "EXT002",
        name: "佐藤",
        tel: "9012345678", // 先頭0なし
      };

      const result = fromEhrPatient(ehr);
      expect(result.tel).toBe("09012345678");
    });

    it("空フィールドは含まない", () => {
      const ehr = {
        externalId: "EXT003",
        name: "高橋",
      };

      const result = fromEhrPatient(ehr);
      expect(result.name).toBe("高橋");
      expect(result.sex).toBeUndefined();
      expect(result.tel).toBeUndefined();
    });
  });

  describe("toEhrKarte", () => {
    it("intake を EhrKarte に変換する", () => {
      const intake = {
        id: 10,
        patient_id: "P001",
        note: "初診カルテ。GLP-1注射希望。",
        status: "OK",
        created_at: "2026-02-22T10:30:00Z",
      };
      const patient = {
        patient_id: "P001",
        name: "山田太郎",
      };

      const result = toEhrKarte(intake, patient);

      expect(result.externalId).toBe("10");
      expect(result.patientExternalId).toBe("P001");
      expect(result.date).toBe("2026-02-22");
      expect(result.content).toBe("初診カルテ。GLP-1注射希望。");
    });
  });

  describe("fromEhrKarte", () => {
    it("EhrKarte を intake.note に変換する", () => {
      const karte = {
        patientExternalId: "P001",
        date: "2026-02-22",
        content: "経過良好",
        diagnosis: "肥満症",
        prescription: "マンジャロ 5mg",
      };

      const result = fromEhrKarte(karte);

      expect(result.note).toContain("経過良好");
      expect(result.note).toContain("【傷病名】肥満症");
      expect(result.note).toContain("【処方】マンジャロ 5mg");
    });

    it("content のみの場合は note にそのまま入る", () => {
      const result = fromEhrKarte({
        patientExternalId: "P001",
        date: "2026-02-22",
        content: "異常なし",
      });

      expect(result.note).toBe("異常なし");
    });
  });
});

// ──────────────────── CSV変換テスト ────────────────────

describe("CSV変換", () => {
  describe("患者CSV", () => {
    it("ヘッダーが正しい", () => {
      expect(PATIENT_CSV_HEADERS).toEqual([
        "患者ID", "氏名", "氏名カナ", "性別", "生年月日", "電話番号", "郵便番号", "住所",
      ]);
    });

    it("EhrPatient → CSV行に変換できる", () => {
      const row = ehrPatientToCsvRow({
        externalId: "P001",
        name: "山田太郎",
        nameKana: "ヤマダタロウ",
        sex: "男",
        birthday: "1990-01-15",
        tel: "09012345678",
        postalCode: "1000001",
        address: "東京都千代田区",
      });

      expect(row).toEqual([
        "P001", "山田太郎", "ヤマダタロウ", "男", "1990-01-15",
        "09012345678", "1000001", "東京都千代田区",
      ]);
    });

    it("CSV行 → EhrPatient に変換できる", () => {
      const row = ["P001", "山田太郎", "ヤマダタロウ", "男", "1990-01-15", "09012345678", "1000001", "東京都千代田区"];
      const result = csvRowToEhrPatient(row);

      expect(result).not.toBeNull();
      expect(result!.externalId).toBe("P001");
      expect(result!.name).toBe("山田太郎");
      expect(result!.tel).toBe("09012345678");
    });

    it("短すぎるCSV行はnullを返す", () => {
      expect(csvRowToEhrPatient([""])).toBeNull();
    });

    it("電話番号は normalizeJPPhone で正規化される", () => {
      const row = ["P001", "テスト", "", "", "", "9012345678"];
      const result = csvRowToEhrPatient(row);
      expect(result!.tel).toBe("09012345678");
    });
  });

  describe("カルテCSV", () => {
    it("ヘッダーが正しい", () => {
      expect(KARTE_CSV_HEADERS).toEqual([
        "患者ID", "診察日", "カルテ本文", "傷病名", "処方内容",
      ]);
    });

    it("EhrKarte → CSV行に変換できる", () => {
      const row = ehrKarteToCsvRow({
        patientExternalId: "P001",
        date: "2026-02-22",
        content: "経過良好",
        diagnosis: "肥満症",
        prescription: "マンジャロ 5mg",
      });

      expect(row).toEqual(["P001", "2026-02-22", "経過良好", "肥満症", "マンジャロ 5mg"]);
    });

    it("CSV行 → EhrKarte に変換できる", () => {
      const row = ["P001", "2026-02-22", "初診", "肥満", "マンジャロ"];
      const result = csvRowToEhrKarte(row);

      expect(result).not.toBeNull();
      expect(result!.patientExternalId).toBe("P001");
      expect(result!.date).toBe("2026-02-22");
      expect(result!.content).toBe("初診");
    });

    it("短すぎるCSV行はnullを返す", () => {
      expect(csvRowToEhrKarte(["P001", "2026-02-22"])).toBeNull();
    });
  });
});

// ──────────────────── CSVアダプターテスト ────────────────────

import {
  parseCsv,
  generatePatientCsv,
  generateKarteCsv,
  parsePatientCsv,
  parseKarteCsv,
  CsvAdapter,
} from "@/lib/ehr/csv-adapter";

describe("CSVアダプター", () => {
  describe("parseCsv", () => {
    it("基本的なCSVをパースできる", () => {
      const csv = 'A,B,C\n1,2,3\n4,5,6';
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["A", "B", "C"],
        ["1", "2", "3"],
        ["4", "5", "6"],
      ]);
    });

    it("ダブルクォートで囲まれたフィールドを正しくパースする", () => {
      const csv = '"hello","world"\n"a,b","c""d"';
      const rows = parseCsv(csv);
      expect(rows[0]).toEqual(["hello", "world"]);
      expect(rows[1]).toEqual(["a,b", 'c"d']);
    });

    it("空行をスキップする", () => {
      const csv = 'A,B\n\n1,2\n';
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
    });
  });

  describe("generatePatientCsv / parsePatientCsv ラウンドトリップ", () => {
    it("患者データをCSV生成→パースで元に戻る", () => {
      const patients = [
        { externalId: "P001", name: "山田太郎", nameKana: "ヤマダタロウ", sex: "男", birthday: "1990-01-15", tel: "09012345678" },
        { externalId: "P002", name: "鈴木花子", sex: "女", birthday: "1985-03-20" },
      ];

      const csv = generatePatientCsv(patients);
      const parsed = parsePatientCsv(csv);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].externalId).toBe("P001");
      expect(parsed[0].name).toBe("山田太郎");
      expect(parsed[1].externalId).toBe("P002");
      expect(parsed[1].name).toBe("鈴木花子");
    });
  });

  describe("generateKarteCsv / parseKarteCsv ラウンドトリップ", () => {
    it("カルテデータをCSV生成→パースで元に戻る", () => {
      const kartes = [
        { patientExternalId: "P001", date: "2026-02-22", content: "初診", diagnosis: "肥満", prescription: "マンジャロ" },
      ];

      const csv = generateKarteCsv(kartes);
      const parsed = parseKarteCsv(csv);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].patientExternalId).toBe("P001");
      expect(parsed[0].content).toBe("初診");
    });
  });

  describe("CsvAdapter", () => {
    let adapter: CsvAdapter;

    beforeEach(() => {
      adapter = new CsvAdapter();
    });

    it("接続テストは常に成功する", async () => {
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
    });

    it("CSVをロードして患者検索できる", async () => {
      const csv = '"患者ID","氏名","氏名カナ","性別","生年月日","電話番号","郵便番号","住所"\n"P001","山田太郎","ヤマダタロウ","男","1990-01-15","09012345678","1000001","東京都"';
      adapter.loadPatients(csv);

      const results = await adapter.searchPatients({ name: "山田" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("山田太郎");
    });

    it("患者をプッシュできる", async () => {
      const { externalId } = await adapter.pushPatient({
        externalId: "NEW001",
        name: "新規患者",
      });
      expect(externalId).toBe("NEW001");

      const found = await adapter.getPatient("NEW001");
      expect(found).not.toBeNull();
      expect(found!.name).toBe("新規患者");
    });

    it("カルテをプッシュ・取得できる", async () => {
      await adapter.pushKarte({
        patientExternalId: "P001",
        date: "2026-02-22",
        content: "テストカルテ",
      });

      const kartes = await adapter.getKarteList("P001");
      expect(kartes).toHaveLength(1);
      expect(kartes[0].content).toBe("テストカルテ");
    });

    it("エクスポートCSVが正しく生成される", async () => {
      await adapter.pushPatient({ externalId: "P001", name: "テスト" });
      const csv = adapter.exportPatientCsv();
      expect(csv).toContain("患者ID");
      expect(csv).toContain("テスト");
    });
  });
});

// ──────────────────── ORCAアダプターテスト ────────────────────

import { OrcaAdapter } from "@/lib/ehr/orca-adapter";

describe("OrcaAdapter", () => {
  let adapter: OrcaAdapter;

  beforeEach(() => {
    adapter = new OrcaAdapter({
      host: "localhost",
      port: 8000,
      user: "ormaster",
      password: "password",
      isWeb: false,
    });
  });

  it("provider が orca", () => {
    expect(adapter.provider).toBe("orca");
  });

  it("testConnection で接続失敗時にエラーメッセージを返す", async () => {
    // fetchをモック（接続拒否）
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await adapter.testConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("ECONNREFUSED");

    vi.restoreAllMocks();
  });

  it("getPatient で接続失敗時にnullを返す", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("timeout"));

    const result = await adapter.getPatient("00001");
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });

  it("searchPatients でname未指定時は空配列を返す", async () => {
    const results = await adapter.searchPatients({});
    expect(results).toEqual([]);
  });

  it("XMLレスポンスから患者情報を正しくパースする", async () => {
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <Patient_Information>
    <Patient_ID>00123</Patient_ID>
    <WholeName>田中太郎</WholeName>
    <WholeName_inKana>タナカタロウ</WholeName_inKana>
    <BirthDate>19900115</BirthDate>
    <Sex>1</Sex>
    <Home_Address_Information>
      <PhoneNumber1>09012345678</PhoneNumber1>
      <HomeAddress_ZipCode>1000001</HomeAddress_ZipCode>
      <WholeAddress1>東京都千代田区</WholeAddress1>
    </Home_Address_Information>
  </Patient_Information>
</data>`;

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(xmlResponse),
    } as Response);

    const result = await adapter.getPatient("00123");

    expect(result).not.toBeNull();
    expect(result!.externalId).toBe("00123");
    expect(result!.name).toBe("田中太郎");
    expect(result!.nameKana).toBe("タナカタロウ");
    expect(result!.sex).toBe("男");
    expect(result!.birthday).toBe("1990-01-15");
    expect(result!.tel).toBe("09012345678");

    vi.restoreAllMocks();
  });
});

// ──────────────────── FHIRアダプターテスト ────────────────────

import { FhirAdapter } from "@/lib/ehr/fhir-adapter";

describe("FhirAdapter", () => {
  let adapter: FhirAdapter;

  beforeEach(() => {
    adapter = new FhirAdapter({
      baseUrl: "https://fhir.example.com",
      authType: "bearer",
      token: "test-token",
    });
  });

  it("provider が fhir", () => {
    expect(adapter.provider).toBe("fhir");
  });

  it("testConnection で接続テストを実行する", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ resourceType: "CapabilityStatement" }),
    } as Response);

    const result = await adapter.testConnection();
    expect(result.ok).toBe(true);
    expect(result.message).toContain("正常に接続");

    vi.restoreAllMocks();
  });

  it("testConnection で接続失敗時にエラーを返す", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await adapter.testConnection();
    expect(result.ok).toBe(false);

    vi.restoreAllMocks();
  });

  it("FHIR Patient レスポンスを EhrPatient に変換する", async () => {
    const fhirPatient = {
      resourceType: "Patient",
      id: "fhir-001",
      name: [{ text: "佐藤次郎", use: "official" }],
      gender: "male",
      birthDate: "1985-06-15",
      telecom: [{ system: "phone", value: "08098765432" }],
      address: [{ text: "大阪府大阪市", postalCode: "5400001" }],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fhirPatient),
    } as Response);

    const result = await adapter.getPatient("fhir-001");

    expect(result).not.toBeNull();
    expect(result!.externalId).toBe("fhir-001");
    expect(result!.name).toBe("佐藤次郎");
    expect(result!.sex).toBe("男");
    expect(result!.birthday).toBe("1985-06-15");
    expect(result!.tel).toBe("08098765432");
    expect(result!.postalCode).toBe("5400001");

    vi.restoreAllMocks();
  });

  it("FHIR Bundle から患者リストを検索できる", async () => {
    const bundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: 2,
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "p1",
            name: [{ text: "患者A" }],
            gender: "female",
          },
        },
        {
          resource: {
            resourceType: "Patient",
            id: "p2",
            name: [{ text: "患者B" }],
            gender: "male",
          },
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundle),
    } as Response);

    const results = await adapter.searchPatients({ name: "患者" });

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("患者A");
    expect(results[0].sex).toBe("女");
    expect(results[1].name).toBe("患者B");
    expect(results[1].sex).toBe("男");

    vi.restoreAllMocks();
  });

  it("getPatient で404時にnullを返す", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const result = await adapter.getPatient("nonexistent");
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });
});

// ──────────────────── Zodバリデーションテスト ────────────────────

import {
  ehrTestConnectionSchema,
  ehrSyncSchema,
  ehrPatientSearchSchema,
  ehrLogsQuerySchema,
  ehrCsvExportSchema,
  ehrSettingsSchema,
} from "@/lib/validations/ehr";

describe("EHR Zodバリデーション", () => {
  describe("ehrTestConnectionSchema", () => {
    it("有効なプロバイダーを受け入れる", () => {
      expect(ehrTestConnectionSchema.safeParse({ provider: "orca" }).success).toBe(true);
      expect(ehrTestConnectionSchema.safeParse({ provider: "csv" }).success).toBe(true);
      expect(ehrTestConnectionSchema.safeParse({ provider: "fhir" }).success).toBe(true);
    });

    it("無効なプロバイダーを拒否する", () => {
      expect(ehrTestConnectionSchema.safeParse({ provider: "invalid" }).success).toBe(false);
    });
  });

  describe("ehrSyncSchema", () => {
    it("有効な同期リクエストを受け入れる", () => {
      const result = ehrSyncSchema.safeParse({
        patient_ids: ["P001", "P002"],
        direction: "push",
        resource_type: "patient",
      });
      expect(result.success).toBe(true);
    });

    it("空のpatient_idsを拒否する", () => {
      const result = ehrSyncSchema.safeParse({
        patient_ids: [],
        direction: "push",
      });
      expect(result.success).toBe(false);
    });

    it("200件を超えるpatient_idsを拒否する", () => {
      const ids = Array.from({ length: 201 }, (_, i) => `P${i}`);
      const result = ehrSyncSchema.safeParse({
        patient_ids: ids,
        direction: "push",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ehrPatientSearchSchema", () => {
    it("名前検索を受け入れる", () => {
      expect(ehrPatientSearchSchema.safeParse({ name: "山田" }).success).toBe(true);
    });

    it("生年月日のフォーマットを検証する", () => {
      expect(ehrPatientSearchSchema.safeParse({ birthday: "1990-01-15" }).success).toBe(true);
      expect(ehrPatientSearchSchema.safeParse({ birthday: "19900115" }).success).toBe(false);
    });
  });

  describe("ehrLogsQuerySchema", () => {
    it("デフォルト値が適用される", () => {
      const result = ehrLogsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("limitの範囲外を拒否する", () => {
      expect(ehrLogsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(ehrLogsQuerySchema.safeParse({ limit: 501 }).success).toBe(false);
    });
  });

  describe("ehrCsvExportSchema", () => {
    it("患者エクスポートを受け入れる", () => {
      const result = ehrCsvExportSchema.safeParse({ type: "patient" });
      expect(result.success).toBe(true);
    });

    it("patient_ids指定を受け入れる", () => {
      const result = ehrCsvExportSchema.safeParse({
        type: "karte",
        patient_ids: ["P001"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ehrSettingsSchema", () => {
    it("ORCA設定を受け入れる", () => {
      const result = ehrSettingsSchema.safeParse({
        provider: "orca",
        orca_host: "192.168.1.100",
        orca_port: 8000,
        orca_user: "admin",
        orca_password: "pass",
        orca_is_web: false,
      });
      expect(result.success).toBe(true);
    });

    it("FHIR設定を受け入れる", () => {
      const result = ehrSettingsSchema.safeParse({
        provider: "fhir",
        fhir_base_url: "https://fhir.example.com",
        fhir_auth_type: "bearer",
        fhir_token: "token123",
      });
      expect(result.success).toBe(true);
    });

    it("無効なポート番号を拒否する", () => {
      const result = ehrSettingsSchema.safeParse({
        provider: "orca",
        orca_port: 99999,
      });
      expect(result.success).toBe(false);
    });
  });
});
