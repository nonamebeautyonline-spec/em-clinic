// lib/validations/dedup.ts — 患者名寄せ用Zodスキーマ
import { z } from "zod";

/** 患者統合リクエスト */
export const mergePatientSchema = z.object({
  keep_id: z.string().min(1, "保持する患者IDは必須です"),
  remove_id: z.string().min(1, "統合元の患者IDは必須です"),
}).passthrough();

/** 重複候補無視リクエスト */
export const ignoreDuplicateSchema = z.object({
  patient_id_a: z.string().min(1, "患者ID Aは必須です"),
  patient_id_b: z.string().min(1, "患者ID Bは必須です"),
}).passthrough();
