// lib/validations/ehr.ts — 電子カルテ連携 Zodバリデーション

import { z } from "zod";

/** 接続テストリクエスト */
export const ehrTestConnectionSchema = z.object({
  provider: z.enum(["orca", "csv", "fhir"]),
});

/** 同期リクエスト */
export const ehrSyncSchema = z.object({
  patient_ids: z.array(z.string().min(1)).min(1).max(200),
  direction: z.enum(["pull", "push"]),
  resource_type: z.enum(["patient", "karte", "both"]).default("patient"),
});

/** 外部患者検索 */
export const ehrPatientSearchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tel: z.string().max(20).optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
});

/** 同期ログ取得 */
export const ehrLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  provider: z.enum(["orca", "csv", "fhir"]).optional(),
  status: z.enum(["success", "error", "skipped"]).optional(),
});

/** CSV インポートプレビュー */
export const ehrCsvPreviewSchema = z.object({
  type: z.enum(["patient", "karte"]),
});

/** CSV インポート実行 */
export const ehrCsvImportSchema = z.object({
  type: z.enum(["patient", "karte"]),
  data: z.array(z.record(z.string(), z.string())).min(1).max(5000),
});

/** CSV エクスポート */
export const ehrCsvExportSchema = z.object({
  type: z.enum(["patient", "karte"]),
  patient_ids: z.array(z.string()).optional(),
});

/** EHR設定更新 */
export const ehrSettingsSchema = z.object({
  provider: z.enum(["orca", "csv", "fhir"]),
  sync_direction: z.enum(["bidirectional", "push", "pull"]).default("bidirectional"),
  auto_sync: z.boolean().default(false),
  // ORCA固有
  orca_host: z.string().max(255).optional(),
  orca_port: z.coerce.number().int().min(1).max(65535).optional(),
  orca_user: z.string().max(100).optional(),
  orca_password: z.string().max(100).optional(),
  orca_is_web: z.boolean().optional(),
  // FHIR固有
  fhir_base_url: z.string().url().optional(),
  fhir_auth_type: z.enum(["bearer", "basic", "smart"]).optional(),
  fhir_token: z.string().max(2000).optional(),
  fhir_username: z.string().max(100).optional(),
  fhir_password: z.string().max(100).optional(),
});
