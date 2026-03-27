// app/api/platform/tenants/[tenantId]/export/route.ts
// テナントデータエクスポートAPI（JSON形式）
// プラットフォーム管理者がテナントの全データをダウンロード

import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { tenantId } = await ctx.params;

  try {
    // テナント基本情報
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!tenant) return notFound("テナントが見つかりません");

    // 並列でデータ取得
    const [
      { data: plan },
      { data: members },
      { data: patients },
      { data: settings },
      { data: invoices },
      { data: usage },
      { data: options },
    ] = await Promise.all([
      // プラン情報
      supabaseAdmin
        .from("tenant_plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      // メンバー（パスワードハッシュ除外）
      supabaseAdmin
        .from("tenant_members")
        .select(`
          id, role, created_at,
          admin_users (
            id, name, email, username, is_active, created_at
          )
        `)
        .eq("tenant_id", tenantId),
      // 患者数（個人情報は含めず、統計のみ）
      supabaseAdmin
        .from("patients")
        .select("patient_id, created_at, status", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      // テナント設定（暗号化値はマスク）
      supabaseAdmin
        .from("tenant_settings")
        .select("category, key, updated_at")
        .eq("tenant_id", tenantId),
      // 請求書
      supabaseAdmin
        .from("billing_invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100),
      // 使用量
      supabaseAdmin
        .from("monthly_usage")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("month", { ascending: false })
        .limit(24),
      // AIオプション
      supabaseAdmin
        .from("tenant_options")
        .select("*")
        .eq("tenant_id", tenantId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: admin.name,
      tenant,
      plan: plan || null,
      members: members || [],
      patientCount: patients,
      settings: (settings || []).map((s) => ({
        category: s.category,
        key: s.key,
        updatedAt: s.updated_at,
        // 値は個人情報保護のため非含有
      })),
      invoices: invoices || [],
      monthlyUsage: usage || [],
      options: options || [],
    };

    // 監査ログ
    logAudit(req, "export_tenant_data", "tenant", tenantId, {
      tenantName: tenant.name,
      exportedBy: admin.name,
    });

    // JSONファイルとしてダウンロード
    const filename = `tenant-${tenant.slug || tenantId}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[platform/tenants/export] エラー:", err);
    return serverError("データエクスポートに失敗しました");
  }
}
