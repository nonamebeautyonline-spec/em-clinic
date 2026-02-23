import { describe, it, expect } from "vitest";
import {
  emptySoapNote,
  soapToText,
  soapToJson,
  parseJsonToSoap,
  plainToSoap,
  noteToSoap,
  soapToNote,
  aiSoapToSoapNote,
  formatNoteForDisplay,
  SOAP_LABELS,
  SOAP_SHORT_LABELS,
} from "@/lib/soap-parser";

describe("soap-parser", () => {
  // --- emptySoapNote ---
  describe("emptySoapNote", () => {
    it("空のSOAPノートを返す", () => {
      const result = emptySoapNote();
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });
  });

  // --- soapToText ---
  describe("soapToText", () => {
    it("全セクション入力時にテキスト変換する", () => {
      const text = soapToText({ s: "頭痛", o: "体温37.5", a: "感冒疑い", p: "解熱剤処方" });
      expect(text).toBe("【S】頭痛\n【O】体温37.5\n【A】感冒疑い\n【P】解熱剤処方");
    });

    it("一部セクションのみの場合、空セクションをスキップする", () => {
      const text = soapToText({ s: "頭痛", o: "", a: "", p: "経過観察" });
      expect(text).toBe("【S】頭痛\n【P】経過観察");
    });

    it("全て空の場合は空文字列を返す", () => {
      const text = soapToText({ s: "", o: "", a: "", p: "" });
      expect(text).toBe("");
    });
  });

  // --- soapToJson ---
  describe("soapToJson", () => {
    it("SOAPノートをJSON文字列に変換する", () => {
      const soap = { s: "主訴", o: "所見", a: "評価", p: "計画" };
      const json = soapToJson(soap);
      expect(JSON.parse(json)).toEqual(soap);
    });
  });

  // --- parseJsonToSoap ---
  describe("parseJsonToSoap", () => {
    it("正常なJSON文字列をパースする", () => {
      const json = JSON.stringify({ s: "頭痛", o: "37.5度", a: "風邪", p: "投薬" });
      const result = parseJsonToSoap(json);
      expect(result).toEqual({ s: "頭痛", o: "37.5度", a: "風邪", p: "投薬" });
    });

    it("不正なJSONの場合は全体をSに入れる", () => {
      const result = parseJsonToSoap("これはJSONではないテキスト");
      expect(result).toEqual({ s: "これはJSONではないテキスト", o: "", a: "", p: "" });
    });

    it("空文字列の場合はSに空文字を入れる", () => {
      const result = parseJsonToSoap("");
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });

    it("JSONだがs/o/a/pが数値型の場合は空文字にする", () => {
      const json = JSON.stringify({ s: 123, o: true, a: null, p: "計画" });
      const result = parseJsonToSoap(json);
      expect(result).toEqual({ s: "", o: "", a: "", p: "計画" });
    });

    it("JSONだがs/o/a/pキーがない場合は空文字にする", () => {
      const json = JSON.stringify({ foo: "bar" });
      const result = parseJsonToSoap(json);
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });
  });

  // --- plainToSoap ---
  describe("plainToSoap", () => {
    it("プレーンテキストをSに入れたSOAPを返す", () => {
      const result = plainToSoap("既存のカルテ内容");
      expect(result).toEqual({ s: "既存のカルテ内容", o: "", a: "", p: "" });
    });

    it("空文字列の場合", () => {
      const result = plainToSoap("");
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });
  });

  // --- noteToSoap ---
  describe("noteToSoap", () => {
    it("note_format=plain の場合、テキストをSに入れる", () => {
      const result = noteToSoap("自由記述テキスト", "plain");
      expect(result).toEqual({ s: "自由記述テキスト", o: "", a: "", p: "" });
    });

    it("note_format=soap の場合、JSONをパースする", () => {
      const json = JSON.stringify({ s: "S内容", o: "O内容", a: "A内容", p: "P内容" });
      const result = noteToSoap(json, "soap");
      expect(result).toEqual({ s: "S内容", o: "O内容", a: "A内容", p: "P内容" });
    });

    it("noteがnullの場合、空のSOAPを返す", () => {
      const result = noteToSoap(null, "soap");
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });

    it("noteがundefinedの場合、空のSOAPを返す", () => {
      const result = noteToSoap(undefined, "plain");
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });
  });

  // --- soapToNote ---
  describe("soapToNote", () => {
    it("soap形式の場合、JSON文字列を返す", () => {
      const soap = { s: "主訴", o: "所見", a: "評価", p: "計画" };
      const note = soapToNote(soap, "soap");
      expect(JSON.parse(note)).toEqual(soap);
    });

    it("plain形式の場合、Sの内容のみ返す", () => {
      const soap = { s: "自由記述の内容", o: "O", a: "A", p: "P" };
      const note = soapToNote(soap, "plain");
      expect(note).toBe("自由記述の内容");
    });
  });

  // --- aiSoapToSoapNote ---
  describe("aiSoapToSoapNote", () => {
    it("AI SOAP結果（大文字キー）を小文字キーに変換する", () => {
      const result = aiSoapToSoapNote({
        S: "患者の訴え",
        O: "検査所見",
        A: "診断名",
        P: "治療方針",
      });
      expect(result).toEqual({
        s: "患者の訴え",
        o: "検査所見",
        a: "診断名",
        p: "治療方針",
      });
    });

    it("一部キーが欠けている場合は空文字にする", () => {
      const result = aiSoapToSoapNote({ S: "主訴のみ" });
      expect(result).toEqual({ s: "主訴のみ", o: "", a: "", p: "" });
    });

    it("全て未定義の場合は全て空文字", () => {
      const result = aiSoapToSoapNote({});
      expect(result).toEqual({ s: "", o: "", a: "", p: "" });
    });
  });

  // --- formatNoteForDisplay ---
  describe("formatNoteForDisplay", () => {
    it("plainフォーマットの場合、そのまま返す", () => {
      const result = formatNoteForDisplay("自由記述テキスト", "plain");
      expect(result).toBe("自由記述テキスト");
    });

    it("soapフォーマットの場合、テキスト形式に変換する", () => {
      const json = JSON.stringify({ s: "頭痛", o: "37.5度", a: "風邪", p: "投薬" });
      const result = formatNoteForDisplay(json, "soap");
      expect(result).toBe("【S】頭痛\n【O】37.5度\n【A】風邪\n【P】投薬");
    });

    it("noteがnullの場合、空文字を返す", () => {
      expect(formatNoteForDisplay(null, "soap")).toBe("");
      expect(formatNoteForDisplay(null, "plain")).toBe("");
    });

    it("noteFormatがnullの場合、plainとして扱う", () => {
      const result = formatNoteForDisplay("テキスト", null);
      expect(result).toBe("テキスト");
    });

    it("noteFormatがundefinedの場合、plainとして扱う", () => {
      const result = formatNoteForDisplay("テキスト", undefined);
      expect(result).toBe("テキスト");
    });
  });

  // --- 定数 ---
  describe("SOAP_LABELS", () => {
    it("4つのラベルが定義されている", () => {
      expect(Object.keys(SOAP_LABELS)).toHaveLength(4);
      expect(SOAP_LABELS.s).toContain("Subjective");
      expect(SOAP_LABELS.o).toContain("Objective");
      expect(SOAP_LABELS.a).toContain("Assessment");
      expect(SOAP_LABELS.p).toContain("Plan");
    });
  });

  describe("SOAP_SHORT_LABELS", () => {
    it("S/O/A/Pの短いラベルが定義されている", () => {
      expect(SOAP_SHORT_LABELS).toEqual({ s: "S", o: "O", a: "A", p: "P" });
    });
  });

  // --- 往復変換テスト ---
  describe("往復変換（roundtrip）", () => {
    it("soapToNote → noteToSoap で元に戻る（soap形式）", () => {
      const original = { s: "主訴", o: "所見", a: "評価", p: "計画" };
      const note = soapToNote(original, "soap");
      const restored = noteToSoap(note, "soap");
      expect(restored).toEqual(original);
    });

    it("soapToNote → noteToSoap で元に戻る（plain形式）", () => {
      const original = { s: "フリーテキスト", o: "", a: "", p: "" };
      const note = soapToNote(original, "plain");
      const restored = noteToSoap(note, "plain");
      expect(restored).toEqual(original);
    });

    it("AIレスポンス → DB保存 → 読み込みの往復", () => {
      const aiResponse = { S: "AI生成の主訴", O: "AI生成の所見", A: "AI生成の評価", P: "AI生成の計画" };
      const soapNote = aiSoapToSoapNote(aiResponse);
      const dbNote = soapToNote(soapNote, "soap");
      const loaded = noteToSoap(dbNote, "soap");
      expect(loaded).toEqual({
        s: "AI生成の主訴",
        o: "AI生成の所見",
        a: "AI生成の評価",
        p: "AI生成の計画",
      });
    });
  });
});
