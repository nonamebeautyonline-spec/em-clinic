// app/api/admin/products/import-csv/route.ts — 商品CSVインポート一括登録API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { productImportSchema } from "@/lib/validations/product-import";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, productImportSchema);
  if ("error" in parsed) return parsed.error;

  const { products, duplicateStrategy } = parsed.data;

  // 既存商品のcode一覧を取得
  const { data: existing } = await strictWithTenant(
    supabaseAdmin.from("products").select("id, code, title, price"),
    tenantId,
  );
  const existingByCode = new Map(
    (existing || []).map((p: { id: string; code: string; title: string; price: number }) => [p.code, p]),
  );

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ code: string; message: string }> = [];

  // 新規INSERT用バッチ
  const toInsert: Array<Record<string, unknown>> = [];
  // UPDATE用リスト
  const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const existingProduct = existingByCode.get(p.code) as { id: string; code: string } | undefined;

    if (existingProduct) {
      if (duplicateStrategy === "skip") {
        skipped++;
        continue;
      }
      // overwrite: UPDATE対象
      toUpdate.push({
        id: existingProduct.id,
        data: {
          title: p.title,
          price: p.price,
          category: p.category || undefined,
          description: p.description || null,
          updated_at: new Date().toISOString(),
        },
      });
    } else {
      // 新規INSERT
      toInsert.push({
        ...tenantPayload(tenantId),
        code: p.code,
        title: p.title,
        price: p.price,
        category: p.category || "other",
        description: p.description || null,
        is_active: true,
        sort_order: i,
      });
    }
  }

  // バッチINSERT
  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabaseAdmin.from("products").insert(batch);
      if (error) {
        console.error("[product-import] batch insert error:", error.message);
        // 個別にリトライ
        for (const item of batch) {
          const { error: singleErr } = await supabaseAdmin.from("products").insert(item);
          if (singleErr) {
            errors.push({ code: String(item.code), message: singleErr.message });
          } else {
            imported++;
          }
        }
      } else {
        imported += batch.length;
      }
    }
  }

  // 個別UPDATE
  for (const { id, data } of toUpdate) {
    const { error } = await strictWithTenant(
      supabaseAdmin.from("products").update(data),
      tenantId,
    ).eq("id", id);
    if (error) {
      errors.push({ code: id, message: error.message });
    } else {
      updated++;
    }
  }

  // 監査ログ
  logAudit(req, "product.import_csv", "product", "bulk", {
    imported,
    updated,
    skipped,
    errors: errors.length,
    duplicateStrategy,
  });

  return NextResponse.json({
    imported,
    updated,
    skipped,
    errors,
    total: products.length,
  });
}
