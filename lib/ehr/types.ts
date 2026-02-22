// lib/ehr/types.ts — 電子カルテ連携 共通型定義

export type EhrProvider = "orca" | "csv" | "fhir";

export type SyncDirection = "pull" | "push";

/** 外部カルテの患者データ */
export interface EhrPatient {
  externalId: string;
  name: string;
  nameKana?: string;
  sex?: string;
  birthday?: string; // YYYY-MM-DD
  tel?: string;
  postalCode?: string;
  address?: string;
  insuranceInfo?: string;
}

/** 外部カルテの診察データ */
export interface EhrKarte {
  externalId?: string;
  patientExternalId: string;
  date: string; // YYYY-MM-DD
  content: string;
  diagnosis?: string;
  prescription?: string;
}

/** アダプター共通インターフェース */
export interface EhrAdapter {
  readonly provider: EhrProvider;

  /** 接続テスト */
  testConnection(): Promise<{ ok: boolean; message: string }>;

  /** 患者取得（外部ID指定） */
  getPatient(externalId: string): Promise<EhrPatient | null>;

  /** 患者検索 */
  searchPatients(query: {
    name?: string;
    tel?: string;
    birthday?: string;
  }): Promise<EhrPatient[]>;

  /** 患者をプッシュ（登録/更新） */
  pushPatient(patient: EhrPatient): Promise<{ externalId: string }>;

  /** カルテ一覧取得 */
  getKarteList(patientExternalId: string): Promise<EhrKarte[]>;

  /** カルテをプッシュ */
  pushKarte(karte: EhrKarte): Promise<void>;
}

/** 同期結果 */
export interface SyncResult {
  provider: EhrProvider;
  direction: SyncDirection;
  resourceType: "patient" | "karte";
  patientId?: string;
  externalId?: string;
  status: "success" | "error" | "skipped";
  detail?: string;
}

/** ORCA接続設定 */
export interface OrcaConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  isWeb: boolean; // WebORCAの場合 /api プレフィックスが必要
}

/** FHIR接続設定 */
export interface FhirConfig {
  baseUrl: string;
  authType: "bearer" | "basic" | "smart";
  token?: string;
  username?: string;
  password?: string;
}
