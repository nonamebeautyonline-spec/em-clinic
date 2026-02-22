// lib/ehr/orca-adapter.ts — ORCA（日レセ）REST/XML APIアダプター

import type { EhrAdapter, EhrPatient, EhrKarte, OrcaConfig } from "./types";

/** ORCA APIアダプター */
export class OrcaAdapter implements EhrAdapter {
  readonly provider = "orca" as const;
  private config: OrcaConfig;
  private baseUrl: string;

  constructor(config: OrcaConfig) {
    this.config = config;
    const prefix = config.isWeb ? "/api" : "";
    this.baseUrl = `http://${config.host}:${config.port}${prefix}`;
  }

  /** BASIC認証ヘッダー生成 */
  private authHeader(): string {
    const cred = Buffer.from(
      `${this.config.user}:${this.config.password}`,
    ).toString("base64");
    return `Basic ${cred}`;
  }

  /** ORCA APIリクエスト実行 */
  private async request(
    path: string,
    method: "GET" | "POST" = "GET",
    body?: string,
  ): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader(),
      "Content-Type": "application/xml",
      Accept: "application/xml",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? body : undefined,
    });

    if (!res.ok) {
      throw new Error(`ORCA API エラー: ${res.status} ${res.statusText}`);
    }

    return res.text();
  }

  // ──────────────────── XMLパース ────────────────────

  /** シンプルなXMLタグ値の取得 */
  private extractTag(xml: string, tag: string): string {
    const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const m = xml.match(re);
    return m?.[1]?.trim() || "";
  }

  /** 複数マッチのXMLブロック抽出 */
  private extractBlocks(xml: string, tag: string): string[] {
    const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "g");
    return xml.match(re) || [];
  }

  /** ORCA XML → EhrPatient 変換 */
  private xmlToPatient(xml: string): EhrPatient | null {
    const id = this.extractTag(xml, "Patient_ID");
    const name = this.extractTag(xml, "WholeName");
    if (!id && !name) return null;

    // 性別コード: 1=男, 2=女
    const sexCode = this.extractTag(xml, "Sex");
    const sex =
      sexCode === "1" ? "男" : sexCode === "2" ? "女" : sexCode || undefined;

    return {
      externalId: id,
      name,
      nameKana: this.extractTag(xml, "WholeName_inKana") || undefined,
      sex,
      birthday: this.formatDate(this.extractTag(xml, "BirthDate")),
      tel:
        this.extractTag(xml, "PhoneNumber1") ||
        this.extractTag(xml, "PhoneNumber2") ||
        undefined,
      postalCode: this.extractTag(xml, "Home_Address_Information")
        ? this.extractTag(xml, "HomeAddress_ZipCode")
        : undefined,
      address:
        this.extractTag(xml, "WholeAddress1") ||
        this.extractTag(xml, "WholeAddress2") ||
        undefined,
    };
  }

  /** ORCA日付形式（YYYY-MM-DD or YYYYMMDD）を正規化 */
  private formatDate(d: string): string | undefined {
    if (!d) return undefined;
    const clean = d.replace(/-/g, "");
    if (clean.length !== 8) return d;
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }

  /** EhrPatient → ORCA 患者登録XMLを生成 */
  private patientToXml(patient: EhrPatient): string {
    // 性別コード変換
    let sexCode = "";
    if (patient.sex === "男" || patient.sex === "male") sexCode = "1";
    else if (patient.sex === "女" || patient.sex === "female") sexCode = "2";

    const birthday = patient.birthday?.replace(/-/g, "") || "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <patientmodreq type="record">
    <Patient_ID type="string">${this.escapeXml(patient.externalId)}</Patient_ID>
    <WholeName type="string">${this.escapeXml(patient.name)}</WholeName>
    <WholeName_inKana type="string">${this.escapeXml(patient.nameKana || "")}</WholeName_inKana>
    <BirthDate type="string">${birthday}</BirthDate>
    <Sex type="string">${sexCode}</Sex>
    <Home_Address_Information type="record">
      <PhoneNumber1 type="string">${this.escapeXml(patient.tel || "")}</PhoneNumber1>
      <HomeAddress_ZipCode type="string">${this.escapeXml(patient.postalCode || "")}</HomeAddress_ZipCode>
      <WholeAddress1 type="string">${this.escapeXml(patient.address || "")}</WholeAddress1>
    </Home_Address_Information>
  </patientmodreq>
</data>`;
  }

  /** XML特殊文字エスケープ */
  private escapeXml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // ──────────────────── EhrAdapter 実装 ────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      // 患者ID=00001で問い合わせ、APIが応答するか確認
      await this.request("/api01rv2/patientgetv2?id=00001");
      return { ok: true, message: "ORCA サーバーに正常に接続しました" };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `接続失敗: ${msg}` };
    }
  }

  async getPatient(externalId: string): Promise<EhrPatient | null> {
    try {
      const xml = await this.request(
        `/api01rv2/patientgetv2?id=${encodeURIComponent(externalId)}`,
      );
      return this.xmlToPatient(xml);
    } catch {
      return null;
    }
  }

  async searchPatients(query: {
    name?: string;
    tel?: string;
    birthday?: string;
  }): Promise<EhrPatient[]> {
    // ORCAは氏名検索APIを提供
    if (!query.name) return [];

    try {
      const xml = await this.request(
        `/api01rv2/patientlst1v2?WholeName=${encodeURIComponent(query.name)}`,
      );
      const blocks = this.extractBlocks(xml, "Patient_Information");
      const results: EhrPatient[] = [];
      for (const block of blocks) {
        const p = this.xmlToPatient(block);
        if (!p) continue;

        // 生年月日でフィルタ
        if (query.birthday && p.birthday !== query.birthday) continue;
        // 電話番号でフィルタ
        if (query.tel && p.tel && !p.tel.includes(query.tel)) continue;

        results.push(p);
      }
      return results;
    } catch {
      return [];
    }
  }

  async pushPatient(
    patient: EhrPatient,
  ): Promise<{ externalId: string }> {
    const xml = this.patientToXml(patient);
    const resXml = await this.request(
      "/api01rv2/patientmodv2",
      "POST",
      xml,
    );

    // レスポンスから患者IDを取得
    const id =
      this.extractTag(resXml, "Patient_ID") || patient.externalId;
    return { externalId: id };
  }

  async getKarteList(
    patientExternalId: string,
  ): Promise<EhrKarte[]> {
    try {
      // ORCA の診療情報取得
      const xml = await this.request(
        `/api01rv2/medicalgetv2?id=${encodeURIComponent(patientExternalId)}`,
      );
      const blocks = this.extractBlocks(xml, "Medical_Information");
      return blocks.map((block) => ({
        externalId: this.extractTag(block, "Medical_ID") || undefined,
        patientExternalId,
        date:
          this.formatDate(this.extractTag(block, "Perform_Date")) ||
          new Date().toISOString().slice(0, 10),
        content: this.extractTag(block, "Medical_Information_child") || "",
        diagnosis: this.extractTag(block, "Disease_Name") || undefined,
        prescription: this.extractTag(block, "Medication_Name") || undefined,
      }));
    } catch {
      return [];
    }
  }

  async pushKarte(karte: EhrKarte): Promise<void> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <medicalmodreq type="record">
    <Patient_ID type="string">${this.escapeXml(karte.patientExternalId)}</Patient_ID>
    <Perform_Date type="string">${karte.date.replace(/-/g, "")}</Perform_Date>
    <Medical_Information type="string">${this.escapeXml(karte.content)}</Medical_Information>
  </medicalmodreq>
</data>`;
    await this.request("/api01rv2/medicalmodv2", "POST", xml);
  }
}
