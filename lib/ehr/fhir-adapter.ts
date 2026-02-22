// lib/ehr/fhir-adapter.ts — HL7 FHIR R4 アダプター

import type { EhrAdapter, EhrPatient, EhrKarte, FhirConfig } from "./types";

/** FHIR Patient リソース（簡易型定義） */
interface FhirPatient {
  resourceType: "Patient";
  id?: string;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  }>;
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  address?: Array<{
    use?: string;
    text?: string;
    postalCode?: string;
  }>;
}

/** FHIR DocumentReference リソース（カルテ用） */
interface FhirDocumentReference {
  resourceType: "DocumentReference";
  id?: string;
  subject?: { reference: string };
  date?: string;
  content?: Array<{
    attachment?: {
      contentType?: string;
      data?: string;
    };
  }>;
  description?: string;
}

/** FHIR Bundle */
interface FhirBundle {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: Array<{
    resource: FhirPatient | FhirDocumentReference;
  }>;
}

/** FHIR R4 アダプター */
export class FhirAdapter implements EhrAdapter {
  readonly provider = "fhir" as const;
  private config: FhirConfig;

  constructor(config: FhirConfig) {
    this.config = config;
  }

  /** 認証ヘッダー生成 */
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
    };

    if (this.config.authType === "bearer" && this.config.token) {
      headers["Authorization"] = `Bearer ${this.config.token}`;
    } else if (this.config.authType === "basic" && this.config.username && this.config.password) {
      const cred = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
      headers["Authorization"] = `Basic ${cred}`;
    }

    return headers;
  }

  /** FHIRサーバーへリクエスト */
  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" = "GET",
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`FHIR API エラー: ${res.status} ${res.statusText}`);
    }

    return res.json() as T;
  }

  // ──────────────────── 変換ヘルパー ────────────────────

  /** FHIR Patient → EhrPatient */
  private fhirToPatient(fp: FhirPatient): EhrPatient {
    const name = fp.name?.[0];
    const fullName = name?.text || [name?.family, ...(name?.given || [])].filter(Boolean).join(" ");

    let sex: string | undefined;
    if (fp.gender === "male") sex = "男";
    else if (fp.gender === "female") sex = "女";

    const phone = fp.telecom?.find((t) => t.system === "phone");
    const addr = fp.address?.[0];

    return {
      externalId: fp.id || "",
      name: fullName || "",
      sex,
      birthday: fp.birthDate,
      tel: phone?.value,
      postalCode: addr?.postalCode,
      address: addr?.text,
    };
  }

  /** EhrPatient → FHIR Patient */
  private patientToFhir(p: EhrPatient): FhirPatient {
    let gender: FhirPatient["gender"] = "unknown";
    if (p.sex === "男" || p.sex === "male") gender = "male";
    else if (p.sex === "女" || p.sex === "female") gender = "female";

    const resource: FhirPatient = {
      resourceType: "Patient",
      name: [{ text: p.name, use: "official" }],
      gender,
      birthDate: p.birthday,
    };

    if (p.externalId) resource.id = p.externalId;

    if (p.tel) {
      resource.telecom = [{ system: "phone", value: p.tel, use: "mobile" }];
    }

    if (p.address || p.postalCode) {
      resource.address = [{
        use: "home",
        text: p.address,
        postalCode: p.postalCode,
      }];
    }

    return resource;
  }

  /** FHIR DocumentReference → EhrKarte */
  private fhirToKarte(doc: FhirDocumentReference, patientId: string): EhrKarte {
    let content = "";
    const attachment = doc.content?.[0]?.attachment;
    if (attachment?.data) {
      content = Buffer.from(attachment.data, "base64").toString("utf-8");
    }

    return {
      externalId: doc.id,
      patientExternalId: patientId,
      date: doc.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      content: content || doc.description || "",
    };
  }

  /** EhrKarte → FHIR DocumentReference */
  private karteToFhir(karte: EhrKarte): FhirDocumentReference {
    return {
      resourceType: "DocumentReference",
      subject: { reference: `Patient/${karte.patientExternalId}` },
      date: karte.date,
      description: karte.content.slice(0, 200),
      content: [{
        attachment: {
          contentType: "text/plain",
          data: Buffer.from(karte.content).toString("base64"),
        },
      }],
    };
  }

  // ──────────────────── EhrAdapter 実装 ────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/metadata");
      return { ok: true, message: "FHIRサーバーに正常に接続しました" };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `接続失敗: ${msg}` };
    }
  }

  async getPatient(externalId: string): Promise<EhrPatient | null> {
    try {
      const fp = await this.request<FhirPatient>(`/Patient/${externalId}`);
      return this.fhirToPatient(fp);
    } catch {
      return null;
    }
  }

  async searchPatients(query: {
    name?: string;
    tel?: string;
    birthday?: string;
  }): Promise<EhrPatient[]> {
    const params = new URLSearchParams();
    if (query.name) params.set("name", query.name);
    if (query.tel) params.set("telecom", query.tel);
    if (query.birthday) params.set("birthdate", query.birthday);

    try {
      const bundle = await this.request<FhirBundle>(
        `/Patient?${params.toString()}`,
      );
      return (
        bundle.entry
          ?.filter((e) => e.resource.resourceType === "Patient")
          .map((e) => this.fhirToPatient(e.resource as FhirPatient)) || []
      );
    } catch {
      return [];
    }
  }

  async pushPatient(
    patient: EhrPatient,
  ): Promise<{ externalId: string }> {
    const resource = this.patientToFhir(patient);

    if (patient.externalId) {
      // 更新
      const updated = await this.request<FhirPatient>(
        `/Patient/${patient.externalId}`,
        "PUT",
        resource,
      );
      return { externalId: updated.id || patient.externalId };
    } else {
      // 新規作成
      const created = await this.request<FhirPatient>(
        "/Patient",
        "POST",
        resource,
      );
      return { externalId: created.id || "" };
    }
  }

  async getKarteList(patientExternalId: string): Promise<EhrKarte[]> {
    try {
      const bundle = await this.request<FhirBundle>(
        `/DocumentReference?subject=Patient/${patientExternalId}`,
      );
      return (
        bundle.entry
          ?.filter((e) => e.resource.resourceType === "DocumentReference")
          .map((e) =>
            this.fhirToKarte(
              e.resource as FhirDocumentReference,
              patientExternalId,
            ),
          ) || []
      );
    } catch {
      return [];
    }
  }

  async pushKarte(karte: EhrKarte): Promise<void> {
    const resource = this.karteToFhir(karte);
    await this.request("/DocumentReference", "POST", resource);
  }
}
