// lib/validations/doctor.ts — 医師関連APIのZodスキーマ
import { z } from "zod";

/** 診察結果更新 POST /api/doctor/update */
export const doctorUpdateSchema = z
  .object({
    reserveId: z.string().min(1, "予約IDは必須です"),
    status: z.string().optional(),
    note: z.string().optional(),
    prescriptionMenu: z.string().optional(),
  })
  .passthrough();

/** 通話ステータス更新 POST /api/doctor/callstatus */
export const callStatusSchema = z
  .object({
    reserveId: z.string().min(1, "reserveIdは必須です"),
    callStatus: z.string().optional().default(""),
  })
  .passthrough();

/** 再処方承認 POST /api/doctor/reorders/approve */
export const doctorReorderApproveSchema = z
  .object({
    id: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "idは必須です" },
    ),
  })
  .passthrough();

/** 再処方却下 POST /api/doctor/reorders/reject */
export const doctorReorderRejectSchema = z
  .object({
    id: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "idは必須です" },
    ),
  })
  .passthrough();
