// lib/validations/reorder-cancel.ts — 再処方キャンセルAPI入力スキーマ
import { z } from "zod";

/** 再処方キャンセル POST /api/reorder/cancel */
export const reorderCancelSchema = z
  .object({
    reorder_id: z.coerce.number({ message: "reorder_idは数値で指定してください" }),
  })
  .passthrough();

export type ReorderCancelInput = z.infer<typeof reorderCancelSchema>;
