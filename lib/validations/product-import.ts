// lib/validations/product-import.ts — 商品CSVインポート用Zodスキーマ
import { z } from "zod/v4";

export const productImportItemSchema = z.object({
  code: z.string().min(1, "商品コードは必須です"),
  title: z.string().min(1, "タイトルは必須です"),
  price: z.number({ error: "priceは数値で指定してください" }),
  category: z.string().optional().default(""),
  description: z.string().nullable().optional(),
});

export const productImportSchema = z.object({
  products: z
    .array(productImportItemSchema)
    .min(1, "商品データが空です")
    .max(1000, "一度に1000件まで"),
  duplicateStrategy: z.enum(["skip", "overwrite"]),
});

export type ProductImportItem = z.infer<typeof productImportItemSchema>;
export type ProductImportRequest = z.infer<typeof productImportSchema>;
