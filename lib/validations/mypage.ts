// lib/validations/mypage.ts — マイページAPI入力スキーマ
import { z } from "zod";

/** マイページダッシュボード POST /api/mypage */
export const mypageDashboardSchema = z
  .object({
    refresh: z.union([z.boolean(), z.literal("1")]).optional(),
  })
  .passthrough();

export type MypageDashboardInput = z.infer<typeof mypageDashboardSchema>;
