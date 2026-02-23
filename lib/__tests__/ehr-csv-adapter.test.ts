// lib/__tests__/ehr-csv-adapter.test.ts — CSVアダプターのテスト

import { parseCsv, CsvAdapter, generatePatientCsv, generateKarteCsv, parsePatientCsv, parseKarteCsv } from "@/lib/ehr/csv-adapter";
import type { EhrPatient, EhrKarte } from "@/lib/ehr/types";

// mapper内のnormalizeJPPhoneをモック（電話番号正規化の副作用を排除）
vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: (tel: string) => tel,
}));

// ──────────────────── parseCsv 純粋関数テスト ────────────────────

describe("parseCsv", () => {
  it("通常のCSVをパースできる", () => {
    const csv = "a,b,c\n1,2,3";
    const result = parseCsv(csv);
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("ダブルクォートで囲まれたセルを正しくパースする", () => {
    const csv = '"hello","world","test"';
    const result = parseCsv(csv);
    expect(result).toEqual([["hello", "world", "test"]]);
  });

  it("ダブルクォート内のエスケープ（\"\"）を処理する", () => {
    const csv = '"say ""hello""","normal"';
    const result = parseCsv(csv);
    expect(result).toEqual([['say "hello"', "normal"]]);
  });

  it("空行をスキップする", () => {
    const csv = "a,b\n\n\nc,d\n\n";
    const result = parseCsv(csv);
    expect(result).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("CRLFの改行を正しく処理する", () => {
    const csv = "a,b\r\nc,d\r\n";
    const result = parseCsv(csv);
    expect(result).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("セル値の前後空白をトリムする", () => {
    const csv = " a , b , c ";
    const result = parseCsv(csv);
    expect(result).toEqual([["a", "b", "c"]]);
  });

  it("空文字列は空配列を返す", () => {
    const result = parseCsv("");
    expect(result).toEqual([]);
  });

  it("カンマのみの行を正しくパースする", () => {
    const csv = ",,";
    const result = parseCsv(csv);
    expect(result).toEqual([["", "", ""]]);
  });

  it("ダブルクォート内のカンマを正しく処理する", () => {
    const csv = '"田中,太郎","東京都,千代田区"';
    const result = parseCsv(csv);
    expect(result).toEqual([["田中,太郎", "東京都,千代田区"]]);
  });
});

// ──────────────────── generatePatientCsv / parsePatientCsv ────────────────────

describe("generatePatientCsv / parsePatientCsv", () => {
  const samplePatient: EhrPatient = {
    externalId: "P001",
    name: "田中太郎",
    nameKana: "タナカタロウ",
    sex: "男",
    birthday: "1990-01-01",
    tel: "09012345678",
    postalCode: "100-0001",
    address: "東京都千代田区",
  };

  it("患者データをCSVに変換し再パースできる（ラウンドトリップ）", () => {
    const csv = generatePatientCsv([samplePatient]);
    const parsed = parsePatientCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].externalId).toBe("P001");
    expect(parsed[0].name).toBe("田中太郎");
    expect(parsed[0].nameKana).toBe("タナカタロウ");
    expect(parsed[0].sex).toBe("男");
    expect(parsed[0].birthday).toBe("1990-01-01");
    expect(parsed[0].tel).toBe("09012345678");
  });

  it("ヘッダー行なしのCSVもパースできる", () => {
    // ヘッダーが「患者ID」で始まらない場合はスキップしない
    const csv = '"P002","佐藤花子","サトウハナコ","女","1985-05-20","08011112222","",""';
    const parsed = parsePatientCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("佐藤花子");
  });
});

// ──────────────────── generateKarteCsv / parseKarteCsv ────────────────────

describe("generateKarteCsv / parseKarteCsv", () => {
  const sampleKarte: EhrKarte = {
    patientExternalId: "P001",
    date: "2026-01-15",
    content: "初診。問診あり。",
    diagnosis: "風邪",
    prescription: "ロキソニン60mg",
  };

  it("カルテデータをCSVに変換し再パースできる（ラウンドトリップ）", () => {
    const csv = generateKarteCsv([sampleKarte]);
    const parsed = parseKarteCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].patientExternalId).toBe("P001");
    expect(parsed[0].content).toBe("初診。問診あり。");
    expect(parsed[0].diagnosis).toBe("風邪");
    expect(parsed[0].prescription).toBe("ロキソニン60mg");
  });
});

// ──────────────────── CsvAdapter クラステスト ────────────────────

describe("CsvAdapter", () => {
  let adapter: CsvAdapter;

  beforeEach(() => {
    adapter = new CsvAdapter();
  });

  it("providerが'csv'である", () => {
    expect(adapter.provider).toBe("csv");
  });

  describe("testConnection", () => {
    it("データ未ロード状態でも接続成功を返す", async () => {
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.message).toContain("患者0件");
      expect(result.message).toContain("カルテ0件");
    });

    it("データロード後は件数が反映される", async () => {
      const csv = '"患者ID","氏名","氏名カナ","性別","生年月日","電話番号","郵便番号","住所"\r\n"P001","田中太郎","","","","","",""';
      adapter.loadPatients(csv);
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.message).toContain("患者1件");
    });
  });

  describe("getPatient", () => {
    it("存在する患者をexternalIdで取得できる", async () => {
      adapter.loadPatients('"P001","田中太郎","","","","","",""');
      const patient = await adapter.getPatient("P001");
      expect(patient).not.toBeNull();
      expect(patient!.name).toBe("田中太郎");
    });

    it("存在しない患者はnullを返す", async () => {
      adapter.loadPatients('"P001","田中太郎","","","","","",""');
      const patient = await adapter.getPatient("P999");
      expect(patient).toBeNull();
    });
  });

  describe("searchPatients", () => {
    beforeEach(() => {
      // 2件の患者をロード
      const csv = [
        '"P001","田中太郎","タナカタロウ","男","1990-01-01","09012345678","",""',
        '"P002","佐藤花子","サトウハナコ","女","1985-05-20","08011112222","",""',
      ].join("\n");
      adapter.loadPatients(csv);
    });

    it("名前で検索できる", async () => {
      const results = await adapter.searchPatients({ name: "田中" });
      expect(results).toHaveLength(1);
      expect(results[0].externalId).toBe("P001");
    });

    it("電話番号で検索できる", async () => {
      const results = await adapter.searchPatients({ tel: "08011112222" });
      expect(results).toHaveLength(1);
      expect(results[0].externalId).toBe("P002");
    });

    it("生年月日で検索できる", async () => {
      const results = await adapter.searchPatients({ birthday: "1990-01-01" });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("田中太郎");
    });

    it("条件なしは全件返す", async () => {
      const results = await adapter.searchPatients({});
      expect(results).toHaveLength(2);
    });

    it("該当なしは空配列を返す", async () => {
      const results = await adapter.searchPatients({ name: "山田" });
      expect(results).toHaveLength(0);
    });
  });

  describe("pushPatient", () => {
    it("新規患者を追加できる", async () => {
      const patient: EhrPatient = {
        externalId: "P100",
        name: "新規患者",
      };
      const result = await adapter.pushPatient(patient);
      expect(result.externalId).toBe("P100");

      const found = await adapter.getPatient("P100");
      expect(found).not.toBeNull();
      expect(found!.name).toBe("新規患者");
    });

    it("既存患者を更新できる", async () => {
      // 最初に患者を追加
      await adapter.pushPatient({ externalId: "P100", name: "初期名前" });
      // 同じexternalIdで更新
      await adapter.pushPatient({ externalId: "P100", name: "更新後名前" });

      const found = await adapter.getPatient("P100");
      expect(found!.name).toBe("更新後名前");

      // 重複追加されていないことを確認
      const all = await adapter.searchPatients({});
      expect(all).toHaveLength(1);
    });
  });

  describe("getKarteList / pushKarte", () => {
    it("カルテを追加して患者IDで取得できる", async () => {
      const karte: EhrKarte = {
        patientExternalId: "P001",
        date: "2026-01-15",
        content: "初診カルテ",
      };
      await adapter.pushKarte(karte);

      const list = await adapter.getKarteList("P001");
      expect(list).toHaveLength(1);
      expect(list[0].content).toBe("初診カルテ");
    });

    it("異なる患者IDのカルテは含まれない", async () => {
      await adapter.pushKarte({ patientExternalId: "P001", date: "2026-01-15", content: "A" });
      await adapter.pushKarte({ patientExternalId: "P002", date: "2026-01-16", content: "B" });

      const list = await adapter.getKarteList("P001");
      expect(list).toHaveLength(1);
      expect(list[0].content).toBe("A");
    });
  });

  describe("exportPatientCsv / exportKarteCsv", () => {
    it("ロードしたデータをエクスポートできる", () => {
      adapter.loadPatients('"P001","田中太郎","","","","","",""');
      const csv = adapter.exportPatientCsv();
      expect(csv).toContain("患者ID");
      expect(csv).toContain("田中太郎");
    });
  });
});
