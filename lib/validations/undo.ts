// lib/validations/undo.ts — Undo操作のZodスキーマ
import { z } from "zod";

/** 取り消し実行 POST /api/admin/undo */
export const executeUndoSchema = z
  .object({
    undo_id: z.number().int().positive("Undo IDは正の整数です"),
  })
  .passthrough();
