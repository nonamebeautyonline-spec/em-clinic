// SOAP構造化カルテのJSON ↔ テキスト変換ユーティリティ

export type SoapNote = {
  s: string; // Subjective（主訴・自覚症状）
  o: string; // Objective（他覚所見・検査結果）
  a: string; // Assessment（評価・診断）
  p: string; // Plan（治療計画・処方）
};

export type NoteFormat = "plain" | "soap";

/** 空のSOAPノートを返す */
export function emptySoapNote(): SoapNote {
  return { s: "", o: "", a: "", p: "" };
}

/** SOAP JSONをテキスト表示用に変換 */
export function soapToText(soap: SoapNote): string {
  const parts: string[] = [];
  if (soap.s) parts.push(`【S】${soap.s}`);
  if (soap.o) parts.push(`【O】${soap.o}`);
  if (soap.a) parts.push(`【A】${soap.a}`);
  if (soap.p) parts.push(`【P】${soap.p}`);
  return parts.join("\n");
}

/** SOAP JSONをDB保存用のJSON文字列に変換 */
export function soapToJson(soap: SoapNote): string {
  return JSON.stringify(soap);
}

/** DB保存されたnoteをSoapNoteにパース（note_format=soapの場合） */
export function parseJsonToSoap(noteJson: string): SoapNote {
  try {
    const parsed = JSON.parse(noteJson);
    return {
      s: typeof parsed.s === "string" ? parsed.s : "",
      o: typeof parsed.o === "string" ? parsed.o : "",
      a: typeof parsed.a === "string" ? parsed.a : "",
      p: typeof parsed.p === "string" ? parsed.p : "",
    };
  } catch {
    // パース失敗時は全体をSに入れる
    return { s: noteJson || "", o: "", a: "", p: "" };
  }
}

/**
 * 既存のプレーンテキストnoteをSOAPに変換
 * 現在の記載内容は全て「S」に入れる
 */
export function plainToSoap(plainText: string): SoapNote {
  return { s: plainText || "", o: "", a: "", p: "" };
}

/**
 * noteとnote_formatからSoapNoteを取得
 * - plain: テキスト全体をSに入れたSoapNoteを返す
 * - soap: JSONパースしてSoapNoteを返す
 */
export function noteToSoap(note: string | null | undefined, noteFormat: NoteFormat): SoapNote {
  if (!note) return emptySoapNote();
  if (noteFormat === "soap") return parseJsonToSoap(note);
  return plainToSoap(note);
}

/**
 * SoapNoteをDB保存用のnote文字列に変換
 * - soap: JSON文字列
 * - plain: sをそのままテキストとして返す
 */
export function soapToNote(soap: SoapNote, format: NoteFormat): string {
  if (format === "soap") return soapToJson(soap);
  // plainモードではS部分のみを保存（後方互換）
  return soap.s;
}

/**
 * AI SOAPカルテ生成の結果をSoapNoteにマッピング
 * generate-karte APIのレスポンスのsoap構造をSoapNoteに変換
 */
export function aiSoapToSoapNote(aiSoap: { S?: string; O?: string; A?: string; P?: string }): SoapNote {
  return {
    s: aiSoap.S || "",
    o: aiSoap.O || "",
    a: aiSoap.A || "",
    p: aiSoap.P || "",
  };
}

/** SOAPセクションのラベル */
export const SOAP_LABELS = {
  s: "S（Subjective / 主訴）",
  o: "O（Objective / 所見）",
  a: "A（Assessment / 評価）",
  p: "P（Plan / 計画）",
} as const;

/** SOAPセクションの短いラベル */
export const SOAP_SHORT_LABELS = {
  s: "S",
  o: "O",
  a: "A",
  p: "P",
} as const;

/** 表示用にnoteを整形（patientbundle等で使用） */
export function formatNoteForDisplay(note: string | null | undefined, noteFormat: NoteFormat | null | undefined): string {
  if (!note) return "";
  const format = noteFormat || "plain";
  if (format === "plain") return note;
  return soapToText(parseJsonToSoap(note));
}
