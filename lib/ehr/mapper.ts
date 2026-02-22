// lib/ehr/mapper.ts — Lオペ ↔ 外部カルテ フィールドマッピング変換

import { normalizeJPPhone } from "@/lib/phone";
import type { EhrPatient, EhrKarte } from "./types";

/** Lオペ patients テーブルの行型 */
interface DbPatient {
  patient_id: string;
  name: string | null;
  name_kana?: string | null;
  sex?: string | null;
  birthday?: string | null;
  tel?: string | null;
}

/** Lオペ intake テーブルの行型 */
interface DbIntake {
  id: number;
  patient_id: string;
  note?: string | null;
  status?: string | null;
  answers?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ──────────────────── 患者マッピング ────────────────────

/** Lオペ患者データ → EhrPatient */
export function toEhrPatient(
  patient: DbPatient,
  intake?: DbIntake | null,
): EhrPatient {
  // intakeのanswersから補完情報を取得
  const answers = intake?.answers as Record<string, string> | undefined;

  return {
    externalId: patient.patient_id,
    name: patient.name || "",
    nameKana: patient.name_kana || answers?.["氏名カナ"] || undefined,
    sex: patient.sex || answers?.["性別"] || undefined,
    birthday: patient.birthday || answers?.["生年月日"] || undefined,
    tel: patient.tel || undefined,
    postalCode: answers?.["郵便番号"] || undefined,
    address: answers?.["住所"] || undefined,
  };
}

/** EhrPatient → Lオペ patients 更新データ */
export function fromEhrPatient(
  ehr: EhrPatient,
): Partial<DbPatient> {
  const update: Partial<DbPatient> = {};

  if (ehr.name) update.name = ehr.name;
  if (ehr.nameKana) update.name_kana = ehr.nameKana;
  if (ehr.sex) update.sex = ehr.sex;
  if (ehr.birthday) update.birthday = ehr.birthday;

  // 電話番号は必ず正規化
  if (ehr.tel) {
    update.tel = normalizeJPPhone(ehr.tel);
  }

  return update;
}

// ──────────────────── カルテマッピング ────────────────────

/** Lオペ intake → EhrKarte */
export function toEhrKarte(
  intake: DbIntake,
  patient: DbPatient,
): EhrKarte {
  return {
    externalId: String(intake.id),
    patientExternalId: patient.patient_id,
    date:
      intake.created_at?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    content: intake.note || "",
    diagnosis: undefined,
    prescription: undefined,
  };
}

/** EhrKarte → intake.note 更新データ */
export function fromEhrKarte(karte: EhrKarte): { note: string } {
  const parts: string[] = [];

  if (karte.content) parts.push(karte.content);
  if (karte.diagnosis) parts.push(`【傷病名】${karte.diagnosis}`);
  if (karte.prescription) parts.push(`【処方】${karte.prescription}`);

  return { note: parts.join("\n") };
}

// ──────────────────── CSV用マッピング ────────────────────

/** 患者CSVヘッダー */
export const PATIENT_CSV_HEADERS = [
  "患者ID",
  "氏名",
  "氏名カナ",
  "性別",
  "生年月日",
  "電話番号",
  "郵便番号",
  "住所",
];

/** カルテCSVヘッダー */
export const KARTE_CSV_HEADERS = [
  "患者ID",
  "診察日",
  "カルテ本文",
  "傷病名",
  "処方内容",
];

/** EhrPatient → CSV行配列 */
export function ehrPatientToCsvRow(p: EhrPatient): string[] {
  return [
    p.externalId,
    p.name,
    p.nameKana || "",
    p.sex || "",
    p.birthday || "",
    p.tel || "",
    p.postalCode || "",
    p.address || "",
  ];
}

/** CSV行配列 → EhrPatient */
export function csvRowToEhrPatient(row: string[]): EhrPatient | null {
  if (row.length < 2) return null;

  const tel = row[5]?.trim();
  return {
    externalId: row[0]?.trim() || "",
    name: row[1]?.trim() || "",
    nameKana: row[2]?.trim() || undefined,
    sex: row[3]?.trim() || undefined,
    birthday: row[4]?.trim() || undefined,
    tel: tel ? normalizeJPPhone(tel) : undefined,
    postalCode: row[6]?.trim() || undefined,
    address: row[7]?.trim() || undefined,
  };
}

/** EhrKarte → CSV行配列 */
export function ehrKarteToCsvRow(k: EhrKarte): string[] {
  return [
    k.patientExternalId,
    k.date,
    k.content,
    k.diagnosis || "",
    k.prescription || "",
  ];
}

/** CSV行配列 → EhrKarte */
export function csvRowToEhrKarte(row: string[]): EhrKarte | null {
  if (row.length < 3) return null;
  return {
    patientExternalId: row[0]?.trim() || "",
    date: row[1]?.trim() || "",
    content: row[2]?.trim() || "",
    diagnosis: row[3]?.trim() || undefined,
    prescription: row[4]?.trim() || undefined,
  };
}
