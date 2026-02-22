// lib/validations/repair.ts — 患者情報修復API入力スキーマ
import { z } from "zod";

/** 個人情報修復 POST /api/repair */
export const repairSchema = z
  .object({
    name_kana: z.string().min(1, "カナ氏名は必須です").max(100),
    sex: z.string().min(1, "性別は必須です"),
    birth: z.string().min(1, "生年月日は必須です"),
    tel: z.string().min(1, "電話番号は必須です"),
  })
  .passthrough();

export type RepairInput = z.infer<typeof repairSchema>;
