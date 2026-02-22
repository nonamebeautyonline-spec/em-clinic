import { z } from "zod";

export const templatePreviewSchema = z.object({
  template_content: z.string().min(1, "テンプレート内容は必須です"),
  patient_id: z.string().optional(),
}).passthrough();
