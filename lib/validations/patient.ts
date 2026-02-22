// lib/validations/patient.ts — 患者関連APIのZodスキーマ
import { z } from "zod";

/** 個人情報登録 POST /api/register/personal-info */
export const personalInfoSchema = z
  .object({
    name: z.string().min(1, "氏名は必須です").max(100),
    name_kana: z.string().min(1, "氏名(カナ)は必須です").max(100),
    sex: z.string().min(1, "性別は必須です"),
    birthday: z.string().min(1, "生年月日は必須です"),
  })
  .passthrough();

/** 問診保存 POST /api/intake */
export const intakeSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()).optional(),
    name: z.string().optional(),
    name_kana: z.string().optional(),
    nameKana: z.string().optional(),
    sex: z.string().optional(),
    birth: z.string().optional(),
    tel: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    line_id: z.string().optional(),
    lineId: z.string().optional(),
    answerer_id: z.string().optional(),
  })
  .passthrough();

/** SMS認証コード送信 POST /api/verify/send */
export const verifySendSchema = z
  .object({
    phone: z.string().min(1, "電話番号は必須です"),
  })
  .passthrough();

/** SMS認証コード確認 POST /api/verify/check */
export const verifyCheckSchema = z
  .object({
    phone: z.string().min(1, "電話番号は必須です"),
    code: z.string().min(1, "認証コードは必須です"),
  })
  .passthrough();

/** 住所更新 POST /api/mypage/update-address */
export const updateAddressSchema = z
  .object({
    orderId: z.string().min(1, "注文IDは必須です"),
    postalCode: z.string().min(1, "郵便番号は必須です"),
    address: z.string().min(1, "住所は必須です").max(200, "住所は200文字以内で入力してください"),
    shippingName: z.string().max(50, "名義は50文字以内で入力してください").optional(),
  })
  .passthrough();
