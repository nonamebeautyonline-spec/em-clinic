// lib/ehr/csv-adapter.ts — CSV連携アダプター

import type { EhrAdapter, EhrPatient, EhrKarte } from "./types";
import {
  PATIENT_CSV_HEADERS,
  KARTE_CSV_HEADERS,
  ehrPatientToCsvRow,
  csvRowToEhrPatient,
  ehrKarteToCsvRow,
  csvRowToEhrKarte,
} from "./mapper";

/** CSVセル値のエスケープ */
function escapeCsvCell(v: string): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV行の生成 */
function toCsvRow(cols: string[]): string {
  return cols.map(escapeCsvCell).join(",");
}

/** CSV文字列をパース（簡易実装、ダブルクォート対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells: string[] = [];
    let current = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ",") {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

/** 患者一覧をCSV文字列に変換 */
export function generatePatientCsv(patients: EhrPatient[]): string {
  const rows = [toCsvRow(PATIENT_CSV_HEADERS)];
  for (const p of patients) {
    rows.push(toCsvRow(ehrPatientToCsvRow(p)));
  }
  return rows.join("\r\n");
}

/** カルテ一覧をCSV文字列に変換 */
export function generateKarteCsv(kartes: EhrKarte[]): string {
  const rows = [toCsvRow(KARTE_CSV_HEADERS)];
  for (const k of kartes) {
    rows.push(toCsvRow(ehrKarteToCsvRow(k)));
  }
  return rows.join("\r\n");
}

/** CSV文字列から患者リストをパース */
export function parsePatientCsv(text: string): EhrPatient[] {
  const rows = parseCsv(text);
  // ヘッダー行をスキップ
  const dataRows = rows.length > 0 && rows[0][0] === "患者ID" ? rows.slice(1) : rows;
  const results: EhrPatient[] = [];
  for (const row of dataRows) {
    const p = csvRowToEhrPatient(row);
    if (p) results.push(p);
  }
  return results;
}

/** CSV文字列からカルテリストをパース */
export function parseKarteCsv(text: string): EhrKarte[] {
  const rows = parseCsv(text);
  const dataRows = rows.length > 0 && rows[0][0] === "患者ID" ? rows.slice(1) : rows;
  const results: EhrKarte[] = [];
  for (const row of dataRows) {
    const k = csvRowToEhrKarte(row);
    if (k) results.push(k);
  }
  return results;
}

/**
 * CSVアダプター
 * CSV連携はファイルベースのため、getPatient/searchPatientsはメモリ上のデータを使う
 */
export class CsvAdapter implements EhrAdapter {
  readonly provider = "csv" as const;
  private patients: EhrPatient[] = [];
  private kartes: EhrKarte[] = [];

  /** インポートされたCSVデータをロード */
  loadPatients(csvText: string): void {
    this.patients = parsePatientCsv(csvText);
  }

  loadKartes(csvText: string): void {
    this.kartes = parseKarteCsv(csvText);
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: `CSV連携: 患者${this.patients.length}件、カルテ${this.kartes.length}件読み込み済み`,
    };
  }

  async getPatient(externalId: string): Promise<EhrPatient | null> {
    return this.patients.find((p) => p.externalId === externalId) || null;
  }

  async searchPatients(query: {
    name?: string;
    tel?: string;
    birthday?: string;
  }): Promise<EhrPatient[]> {
    return this.patients.filter((p) => {
      if (query.name && !p.name.includes(query.name)) return false;
      if (query.tel && p.tel !== query.tel) return false;
      if (query.birthday && p.birthday !== query.birthday) return false;
      return true;
    });
  }

  async pushPatient(
    patient: EhrPatient,
  ): Promise<{ externalId: string }> {
    const idx = this.patients.findIndex(
      (p) => p.externalId === patient.externalId,
    );
    if (idx >= 0) {
      this.patients[idx] = patient;
    } else {
      this.patients.push(patient);
    }
    return { externalId: patient.externalId };
  }

  async getKarteList(patientExternalId: string): Promise<EhrKarte[]> {
    return this.kartes.filter(
      (k) => k.patientExternalId === patientExternalId,
    );
  }

  async pushKarte(karte: EhrKarte): Promise<void> {
    this.kartes.push(karte);
  }

  /** エクスポート用: 現在のデータをCSV文字列に変換 */
  exportPatientCsv(): string {
    return generatePatientCsv(this.patients);
  }

  exportKarteCsv(): string {
    return generateKarteCsv(this.kartes);
  }
}
