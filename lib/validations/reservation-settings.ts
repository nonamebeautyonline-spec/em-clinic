// lib/validations/reservation-settings.ts — 予約設定APIのZodスキーマ
import { z } from "zod";

/** 予約設定更新 PUT /api/admin/reservation-settings */
export const reservationSettingsSchema = z.object({
  change_deadline_hours: z.number().int().min(0).default(0),
  cancel_deadline_hours: z.number().int().min(0).default(0),
  booking_start_days_before: z.number().int().min(1).default(60),
  booking_deadline_hours_before: z.number().int().min(0).default(0),
  booking_open_day: z.number().int().min(1).max(28).default(5),
}).passthrough();

/** 予約枠 */
export const reservationSlotSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional().nullable(),
  duration_minutes: z.number().int().min(5).default(15),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
}).passthrough();

/** コース */
export const reservationCourseSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  duration_minutes: z.number().int().min(5).default(15),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
}).passthrough();

/** 予約枠×コースリンク設定 */
export const slotCourseLinksSchema = z.object({
  course_ids: z.array(z.string().uuid()),
}).passthrough();
