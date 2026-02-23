// lib/__tests__/ehr-adapters.test.ts — ORCA・FHIRアダプターのテスト

import { OrcaAdapter } from "@/lib/ehr/orca-adapter";
import { FhirAdapter } from "@/lib/ehr/fhir-adapter";
import type { EhrPatient, EhrKarte, OrcaConfig, FhirConfig } from "@/lib/ehr/types";

// ──────────────────── fetchモック ────────────────────

// テストごとにfetchモックをリセット
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ──────────────────── ヘルパー ────────────────────

/** fetchモックで成功レスポンスを返す */
function mockFetchOk(body: string, contentType = "text/xml") {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  });
}

/** fetchモックでエラーレスポンスを返す */
function mockFetchError(status = 500, statusText = "Internal Server Error") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve({}),
  });
}

// ====================================================================
//  OrcaAdapter テスト
// ====================================================================

describe("OrcaAdapter", () => {
  const defaultConfig: OrcaConfig = {
    host: "localhost",
    port: 8000,
    user: "ormaster",
    password: "password123",
    isWeb: false,
  };

  describe("コンストラクタ", () => {
    it("isWeb=falseの場合、/apiプレフィックスなしのURLを生成する", () => {
      const adapter = new OrcaAdapter({ ...defaultConfig, isWeb: false });
      expect(adapter.provider).toBe("orca");

      // testConnectionで実際のURLを検証
      mockFetchOk("<response/>");
      adapter.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8000/api01rv2"),
        expect.any(Object),
      );
    });

    it("isWeb=trueの場合、/apiプレフィックス付きのURLを生成する", () => {
      const adapter = new OrcaAdapter({ ...defaultConfig, isWeb: true });
      mockFetchOk("<response/>");
      adapter.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8000/api/api01rv2"),
        expect.any(Object),
      );
    });
  });

  describe("認証ヘッダー", () => {
    it("BASIC認証ヘッダーが正しく生成される", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response/>");
      await adapter.testConnection();

      const expectedAuth = `Basic ${Buffer.from("ormaster:password123").toString("base64")}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });
  });

  describe("testConnection", () => {
    it("接続成功時にok=trueを返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response><Patient_ID>00001</Patient_ID></response>");
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.message).toContain("正常に接続");
    });

    it("接続失敗時にok=falseを返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchError(500, "Internal Server Error");
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain("接続失敗");
    });
  });

  describe("getPatient", () => {
    it("患者XMLを正しくEhrPatientに変換する", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      const xml = `
        <response>
          <Patient_ID>P001</Patient_ID>
          <WholeName>田中太郎</WholeName>
          <WholeName_inKana>タナカタロウ</WholeName_inKana>
          <Sex>1</Sex>
          <BirthDate>19900101</BirthDate>
          <PhoneNumber1>09012345678</PhoneNumber1>
        </response>
      `;
      mockFetchOk(xml);

      const patient = await adapter.getPatient("P001");
      expect(patient).not.toBeNull();
      expect(patient!.externalId).toBe("P001");
      expect(patient!.name).toBe("田中太郎");
      expect(patient!.nameKana).toBe("タナカタロウ");
      expect(patient!.sex).toBe("男");
      expect(patient!.birthday).toBe("1990-01-01");
      expect(patient!.tel).toBe("09012345678");
    });

    it("性別コード2は「女」に変換される", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response><Patient_ID>P002</Patient_ID><WholeName>佐藤花子</WholeName><Sex>2</Sex></response>");

      const patient = await adapter.getPatient("P002");
      expect(patient!.sex).toBe("女");
    });

    it("APIエラー時はnullを返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchError(404, "Not Found");
      const patient = await adapter.getPatient("P999");
      expect(patient).toBeNull();
    });
  });

  describe("searchPatients", () => {
    it("名前で患者を検索できる", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      const xml = `
        <response>
          <Patient_Information>
            <Patient_ID>P001</Patient_ID>
            <WholeName>田中太郎</WholeName>
            <Sex>1</Sex>
            <BirthDate>1990-01-01</BirthDate>
          </Patient_Information>
        </response>
      `;
      mockFetchOk(xml);

      const results = await adapter.searchPatients({ name: "田中" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("田中太郎");
    });

    it("名前が指定されない場合は空配列を返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      const results = await adapter.searchPatients({ tel: "090" });
      expect(results).toHaveLength(0);
      // fetchが呼ばれないことを確認
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("生年月日でフィルタリングできる", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      const xml = `
        <response>
          <Patient_Information>
            <Patient_ID>P001</Patient_ID>
            <WholeName>田中太郎</WholeName>
            <BirthDate>1990-01-01</BirthDate>
          </Patient_Information>
          <Patient_Information>
            <Patient_ID>P002</Patient_ID>
            <WholeName>田中花子</WholeName>
            <BirthDate>1985-05-20</BirthDate>
          </Patient_Information>
        </response>
      `;
      mockFetchOk(xml);

      const results = await adapter.searchPatients({
        name: "田中",
        birthday: "1990-01-01",
      });
      expect(results).toHaveLength(1);
      expect(results[0].externalId).toBe("P001");
    });

    it("APIエラー時は空配列を返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchError(500);
      const results = await adapter.searchPatients({ name: "田中" });
      expect(results).toHaveLength(0);
    });
  });

  describe("pushPatient", () => {
    it("患者を登録してexternalIdを返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response><Patient_ID>P001</Patient_ID></response>");

      const patient: EhrPatient = {
        externalId: "P001",
        name: "田中太郎",
        sex: "男",
        birthday: "1990-01-01",
      };
      const result = await adapter.pushPatient(patient);
      expect(result.externalId).toBe("P001");

      // POSTリクエストであることを確認
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api01rv2/patientmodv2"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("レスポンスにPatient_IDがない場合は元のexternalIdを返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response><result>OK</result></response>");

      const result = await adapter.pushPatient({
        externalId: "P999",
        name: "テスト",
      });
      expect(result.externalId).toBe("P999");
    });
  });

  describe("getKarteList", () => {
    it("診療情報を取得してEhrKarte配列に変換する", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      const xml = `
        <response>
          <Medical_Information>
            <Medical_ID>M001</Medical_ID>
            <Perform_Date>20260115</Perform_Date>
            <Medical_Information_child>初診</Medical_Information_child>
            <Disease_Name>風邪</Disease_Name>
            <Medication_Name>ロキソニン</Medication_Name>
          </Medical_Information>
        </response>
      `;
      mockFetchOk(xml);

      const kartes = await adapter.getKarteList("P001");
      expect(kartes).toHaveLength(1);
      expect(kartes[0].externalId).toBe("M001");
      expect(kartes[0].date).toBe("2026-01-15");
      expect(kartes[0].content).toBe("初診");
      expect(kartes[0].diagnosis).toBe("風邪");
    });

    it("APIエラー時は空配列を返す", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchError(500);
      const kartes = await adapter.getKarteList("P001");
      expect(kartes).toHaveLength(0);
    });
  });

  describe("pushKarte", () => {
    it("カルテをPOSTで送信できる", async () => {
      const adapter = new OrcaAdapter(defaultConfig);
      mockFetchOk("<response><result>OK</result></response>");

      const karte: EhrKarte = {
        patientExternalId: "P001",
        date: "2026-01-15",
        content: "初診カルテ内容",
      };
      await adapter.pushKarte(karte);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api01rv2/medicalmodv2"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});

// ====================================================================
//  FhirAdapter テスト
// ====================================================================

describe("FhirAdapter", () => {
  const bearerConfig: FhirConfig = {
    baseUrl: "https://fhir.example.com/r4",
    authType: "bearer",
    token: "test-token-123",
  };

  const basicConfig: FhirConfig = {
    baseUrl: "https://fhir.example.com/r4",
    authType: "basic",
    username: "admin",
    password: "secret",
  };

  const smartConfig: FhirConfig = {
    baseUrl: "https://fhir.example.com/r4",
    authType: "smart",
  };

  describe("コンストラクタ", () => {
    it("providerが'fhir'である", () => {
      const adapter = new FhirAdapter(bearerConfig);
      expect(adapter.provider).toBe("fhir");
    });

    it("bearer認証の場合、Bearerヘッダーが付与される", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({ resourceType: "CapabilityStatement" }));
      await adapter.testConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        }),
      );
    });

    it("basic認証の場合、Basicヘッダーが付与される", async () => {
      const adapter = new FhirAdapter(basicConfig);
      mockFetchOk(JSON.stringify({ resourceType: "CapabilityStatement" }));
      await adapter.testConnection();

      const expectedAuth = `Basic ${Buffer.from("admin:secret").toString("base64")}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        }),
      );
    });

    it("smart認証の場合、Authorizationヘッダーが付与されない", async () => {
      const adapter = new FhirAdapter(smartConfig);
      mockFetchOk(JSON.stringify({ resourceType: "CapabilityStatement" }));
      await adapter.testConnection();

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders).not.toHaveProperty("Authorization");
    });
  });

  describe("testConnection", () => {
    it("接続成功時にok=trueを返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({ resourceType: "CapabilityStatement" }));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.message).toContain("正常に接続");
    });

    it("接続失敗時にok=falseを返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchError(401, "Unauthorized");
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain("接続失敗");
    });
  });

  describe("getPatient", () => {
    it("FHIRリソースをEhrPatientに正しく変換する", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      const fhirPatient = {
        resourceType: "Patient",
        id: "fhir-001",
        name: [{ text: "山田太郎", use: "official" }],
        gender: "male",
        birthDate: "1990-05-15",
        telecom: [{ system: "phone", value: "09099998888", use: "mobile" }],
        address: [{ use: "home", text: "大阪府大阪市", postalCode: "530-0001" }],
      };
      mockFetchOk(JSON.stringify(fhirPatient));

      const patient = await adapter.getPatient("fhir-001");
      expect(patient).not.toBeNull();
      expect(patient!.externalId).toBe("fhir-001");
      expect(patient!.name).toBe("山田太郎");
      expect(patient!.sex).toBe("男");
      expect(patient!.birthday).toBe("1990-05-15");
      expect(patient!.tel).toBe("09099998888");
      expect(patient!.postalCode).toBe("530-0001");
      expect(patient!.address).toBe("大阪府大阪市");
    });

    it("gender=femaleは「女」に変換される", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({
        resourceType: "Patient",
        id: "fhir-002",
        name: [{ text: "佐藤花子" }],
        gender: "female",
      }));

      const patient = await adapter.getPatient("fhir-002");
      expect(patient!.sex).toBe("女");
    });

    it("name.textがない場合はfamily+givenで名前を組み立てる", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({
        resourceType: "Patient",
        id: "fhir-003",
        name: [{ family: "鈴木", given: ["一郎"] }],
      }));

      const patient = await adapter.getPatient("fhir-003");
      expect(patient!.name).toBe("鈴木 一郎");
    });

    it("APIエラー時はnullを返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchError(404, "Not Found");
      const patient = await adapter.getPatient("nonexistent");
      expect(patient).toBeNull();
    });
  });

  describe("searchPatients", () => {
    it("名前で患者を検索できる", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      const bundle = {
        resourceType: "Bundle",
        type: "searchset",
        total: 1,
        entry: [
          {
            resource: {
              resourceType: "Patient",
              id: "fhir-001",
              name: [{ text: "田中太郎" }],
              gender: "male",
            },
          },
        ],
      };
      mockFetchOk(JSON.stringify(bundle));

      const results = await adapter.searchPatients({ name: "田中" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("田中太郎");
    });

    it("複数の検索パラメータを組み合わせられる", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      const bundle = {
        resourceType: "Bundle",
        type: "searchset",
        entry: [],
      };
      mockFetchOk(JSON.stringify(bundle));

      await adapter.searchPatients({
        name: "田中",
        tel: "090",
        birthday: "1990-01-01",
      });

      // URLにクエリパラメータが含まれていることを確認
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("name=");
      expect(calledUrl).toContain("telecom=");
      expect(calledUrl).toContain("birthdate=");
    });

    it("結果が空の場合は空配列を返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({
        resourceType: "Bundle",
        type: "searchset",
      }));

      const results = await adapter.searchPatients({ name: "存在しない" });
      expect(results).toHaveLength(0);
    });

    it("APIエラー時は空配列を返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchError(500);
      const results = await adapter.searchPatients({ name: "田中" });
      expect(results).toHaveLength(0);
    });
  });

  describe("pushPatient", () => {
    it("externalIdがある場合はPUTで更新する", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({
        resourceType: "Patient",
        id: "fhir-001",
      }));

      const patient: EhrPatient = {
        externalId: "fhir-001",
        name: "田中太郎",
        sex: "男",
      };
      const result = await adapter.pushPatient(patient);
      expect(result.externalId).toBe("fhir-001");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/Patient/fhir-001"),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("externalIdがない場合はPOSTで新規作成する", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({
        resourceType: "Patient",
        id: "new-id-123",
      }));

      const patient: EhrPatient = {
        externalId: "",
        name: "新規患者",
      };
      const result = await adapter.pushPatient(patient);
      expect(result.externalId).toBe("new-id-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/Patient$/),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("性別が正しくFHIR gender値に変換される", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({ resourceType: "Patient", id: "p1" }));

      await adapter.pushPatient({
        externalId: "",
        name: "テスト",
        sex: "女",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.gender).toBe("female");
    });
  });

  describe("getKarteList", () => {
    it("DocumentReferenceをEhrKarte配列に変換する", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      const contentBase64 = Buffer.from("カルテ内容テスト").toString("base64");
      const bundle = {
        resourceType: "Bundle",
        type: "searchset",
        entry: [
          {
            resource: {
              resourceType: "DocumentReference",
              id: "doc-001",
              subject: { reference: "Patient/fhir-001" },
              date: "2026-01-15T09:00:00Z",
              description: "初診カルテ",
              content: [{
                attachment: {
                  contentType: "text/plain",
                  data: contentBase64,
                },
              }],
            },
          },
        ],
      };
      mockFetchOk(JSON.stringify(bundle));

      const kartes = await adapter.getKarteList("fhir-001");
      expect(kartes).toHaveLength(1);
      expect(kartes[0].externalId).toBe("doc-001");
      expect(kartes[0].patientExternalId).toBe("fhir-001");
      expect(kartes[0].date).toBe("2026-01-15");
      expect(kartes[0].content).toBe("カルテ内容テスト");
    });

    it("APIエラー時は空配列を返す", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchError(500);
      const kartes = await adapter.getKarteList("fhir-001");
      expect(kartes).toHaveLength(0);
    });
  });

  describe("pushKarte", () => {
    it("カルテをDocumentReferenceとしてPOSTできる", async () => {
      const adapter = new FhirAdapter(bearerConfig);
      mockFetchOk(JSON.stringify({ resourceType: "DocumentReference", id: "doc-new" }));

      const karte: EhrKarte = {
        patientExternalId: "fhir-001",
        date: "2026-01-15",
        content: "診察内容をここに記載",
      };
      await adapter.pushKarte(karte);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/DocumentReference"),
        expect.objectContaining({ method: "POST" }),
      );

      // 送信されたbodyにFHIR構造が含まれるか確認
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.resourceType).toBe("DocumentReference");
      expect(body.subject.reference).toBe("Patient/fhir-001");
      expect(body.date).toBe("2026-01-15");
    });
  });
});
