// 医療辞書管理 API — CRUD + デフォルト辞書一括投入
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import {
  createVocabularySchema,
  updateVocabularySchema,
  deleteVocabularySchema,
  seedVocabularySchema,
} from "@/lib/validations/voice";
import { getDefaultVocabulary, type Specialty } from "@/lib/voice/default-vocabulary";
import { redis } from "@/lib/redis";

// Redis キャッシュキー
function vocabCacheKey(tenantId: string | null): string {
  return `vocab:${tenantId || "global"}`;
}

// キャッシュ無効化
async function invalidateVocabCache(tenantId: string | null) {
  try {
    await redis.del(vocabCacheKey(tenantId));
  } catch {
    // Redis 障害時は無視
  }
}

// --- GET: テナントの辞書一覧取得 ---
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // クエリパラメータでフィルタ
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const specialty = searchParams.get("specialty");
  const search = searchParams.get("search");

  let query = withTenant(
    supabaseAdmin
      .from("medical_vocabulary")
      .select("*")
      .order("category")
      .order("term"),
    tenantId
  );

  if (category) {
    query = query.eq("category", category);
  }
  if (specialty) {
    query = query.eq("specialty", specialty);
  }
  if (search) {
    query = query.or(`term.ilike.%${search}%,reading.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], count: data?.length || 0 });
}

// --- POST: 用語追加 or デフォルト辞書一括投入 ---
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // action パラメータで分岐
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "seed") {
    return handleSeed(req, tenantId);
  }

  // 通常の用語追加
  const parsed = await parseBody(req, createVocabularySchema);
  if ("error" in parsed) return parsed.error;
  const { term, reading, category, specialty, boost_weight } = parsed.data;

  // 重複チェック
  const { data: existing } = await withTenant(
    supabaseAdmin
      .from("medical_vocabulary")
      .select("id")
      .eq("term", term)
      .eq("specialty", specialty),
    tenantId
  );

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `「${term}」は既に登録されています` },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("medical_vocabulary")
    .insert({
      ...tenantPayload(tenantId),
      term,
      reading: reading || null,
      category,
      specialty,
      boost_weight,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await invalidateVocabCache(tenantId);
  logAudit(req, "create", "medical_vocabulary", data.id, { term, category, specialty });

  return NextResponse.json({ ok: true, item: data });
}

// デフォルト辞書一括投入
async function handleSeed(req: NextRequest, tenantId: string | null) {
  const parsed = await parseBody(req, seedVocabularySchema);
  if ("error" in parsed) return parsed.error;
  const { specialties } = parsed.data;

  const entries = getDefaultVocabulary(specialties as Specialty[]);

  // 既存のデフォルト辞書を削除（同テナント）
  await withTenant(
    supabaseAdmin
      .from("medical_vocabulary")
      .delete()
      .eq("is_default", true),
    tenantId
  );

  // 一括 INSERT
  const rows = entries.map((entry) => ({
    ...tenantPayload(tenantId),
    term: entry.term,
    reading: entry.reading || null,
    category: entry.category,
    specialty: specialties.find(
      (sp: string) =>
        (getDefaultVocabulary([sp as Specialty]).find((e) => e.term === entry.term) &&
          sp !== "common") ||
        false
    ) || "common",
    boost_weight: entry.boost_weight,
    is_default: true,
  }));

  const { data, error } = await supabaseAdmin
    .from("medical_vocabulary")
    .insert(rows)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await invalidateVocabCache(tenantId);
  logAudit(req, "seed", "medical_vocabulary", "bulk", {
    specialties,
    count: data?.length || 0,
  });

  return NextResponse.json({
    ok: true,
    message: `${data?.length || 0}件のデフォルト辞書を登録しました`,
    count: data?.length || 0,
  });
}

// --- PUT: 用語更新 ---
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, updateVocabularySchema);
  if ("error" in parsed) return parsed.error;
  const { id, ...updates } = parsed.data;

  // 存在チェック
  const { data: existing } = await withTenant(
    supabaseAdmin.from("medical_vocabulary").select("id").eq("id", id),
    tenantId
  ).single();

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "用語が見つかりません" },
      { status: 404 }
    );
  }

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("medical_vocabulary")
      .update(updates)
      .eq("id", id),
    tenantId
  )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await invalidateVocabCache(tenantId);
  logAudit(req, "update", "medical_vocabulary", id, updates);

  return NextResponse.json({ ok: true, item: data });
}

// --- DELETE: 用語削除 ---
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, deleteVocabularySchema);
  if ("error" in parsed) return parsed.error;
  const { id } = parsed.data;

  const { error } = await withTenant(
    supabaseAdmin.from("medical_vocabulary").delete().eq("id", id),
    tenantId
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await invalidateVocabCache(tenantId);
  logAudit(req, "delete", "medical_vocabulary", id);

  return NextResponse.json({ ok: true });
}
