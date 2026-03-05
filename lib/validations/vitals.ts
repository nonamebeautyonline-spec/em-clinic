// lib/validations/vitals.ts — バイタルサイン入力のZodスキーマ
import { z } from "zod";

/** バイタル記録の作成スキーマ */
export const vitalCreateSchema = z.object({
  patient_id: z.string().min(1, "患者IDは必須です"),
  intake_id: z.number().int().positive().optional(),
  measured_at: z.string().optional(), // ISO文字列、省略時now()
  weight_kg: z.number().min(0).max(500).optional(),
  height_cm: z.number().min(0).max(300).optional(),
  bmi: z.number().min(0).max(100).optional(),
  systolic_bp: z.number().int().min(0).max(400).optional(),
  diastolic_bp: z.number().int().min(0).max(300).optional(),
  pulse: z.number().int().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  spo2: z.number().int().min(0).max(100).optional(),
  respiratory_rate: z.number().int().min(0).max(100).optional(),
  waist_cm: z.number().min(0).max(300).optional(),
  notes: z.string().max(500).optional(),
});

export type VitalCreateInput = z.infer<typeof vitalCreateSchema>;

/** バイタルレコード型（DB返却値） */
export type PatientVital = {
  id: string;
  patient_id: string;
  tenant_id: string;
  intake_id: number | null;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  waist_cm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
