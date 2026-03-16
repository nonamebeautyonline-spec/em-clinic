// lib/validations/inquiry.ts — お問い合わせフォームバリデーション
import { z } from "zod";

export const inquirySchema = z.object({
  company_name: z.string().max(200).optional().default(""),
  contact_name: z.string().min(1, "お名前を入力してください").max(100),
  service_name: z.string().max(200).optional().default(""),
  implementation_timing: z.string().max(100).optional().default(""),
  has_existing_line: z.boolean().optional().default(false),
  existing_line_detail: z.string().max(500).optional().default(""),
  message: z.string().max(5000).optional().default(""),
  email: z.string().email("正しいメールアドレスを入力してください"),
  phone: z.string().max(20).optional().default(""),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
