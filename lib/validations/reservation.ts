// lib/validations/reservation.ts — 予約関連APIのZodスキーマ
import { z } from "zod";

/** 予約作成 POST /api/reservations (type=createReservation) */
export const createReservationSchema = z
  .object({
    type: z.literal("createReservation").optional(),
    date: z.string().min(1, "日付は必須です"),
    time: z.string().min(1, "時刻は必須です"),
    patient_id: z.string().optional(),
  })
  .passthrough();

/** 予約キャンセル POST /api/reservations (type=cancelReservation) */
export const cancelReservationSchema = z
  .object({
    type: z.literal("cancelReservation"),
    reserveId: z.string().optional(),
    reservationId: z.string().optional(),
    id: z.string().optional(),
    patient_id: z.string().optional(),
  })
  .passthrough();

/** 予約変更 POST /api/reservations (type=updateReservation) */
export const updateReservationSchema = z
  .object({
    type: z.literal("updateReservation"),
    reserveId: z.string().optional(),
    reservationId: z.string().optional(),
    date: z.string().min(1, "日付は必須です"),
    time: z.string().min(1, "時刻は必須です"),
    patient_id: z.string().optional(),
  })
  .passthrough();

/** 予約リクエスト全体（typeで分岐） */
export const reservationRequestSchema = z
  .object({
    type: z.enum(["createReservation", "cancelReservation", "updateReservation"]).optional(),
  })
  .passthrough();
