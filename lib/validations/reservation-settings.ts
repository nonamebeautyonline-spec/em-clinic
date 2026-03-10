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

/** 予約アクション設定 */
export const RESERVATION_EVENT_TYPES = [
  "reservation_created",
  "reservation_changed",
  "reservation_canceled",
] as const;
export type ReservationEventType = typeof RESERVATION_EVENT_TYPES[number];

export const ACTION_TYPES = [
  "text_send",
  "template_send",
  "tag_add",
  "tag_remove",
  "mark_change",
  "menu_change",
] as const;
export type ActionType = typeof ACTION_TYPES[number];

/** アクションアイテム（1個の動作） */
export const reservationActionItemSchema = z.object({
  id: z.string().uuid().optional(), // 更新時のみ
  action_type: z.enum(ACTION_TYPES),
  sort_order: z.number().int().min(0).default(0),
  config: z.record(z.string(), z.unknown()).default({}),
}).passthrough();

/** イベント単位のアクション設定 */
export const reservationActionSettingSchema = z.object({
  event_type: z.enum(RESERVATION_EVENT_TYPES),
  is_enabled: z.boolean().default(true),
  repeat_on_subsequent: z.boolean().default(true),
  items: z.array(reservationActionItemSchema).default([]),
}).passthrough();

/** 予約アクション設定一括更新（3イベント分） */
export const reservationActionSettingsSchema = z.object({
  actions: z.array(reservationActionSettingSchema).min(1).max(3),
}).passthrough();
