// app/api/platform/tenants/route.ts
// テナント一覧取得・テナント新規作成API

import { NextRequest, NextResponse } from "next/server";
import { conflict, forbidden, serverError } from "@/lib/api-error";
import bcrypt from "bcryptjs";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { createTenantSchema } from "@/lib/validations/platform-tenant";
import { generateUsername } from "@/lib/username";
import { seedTenantData } from "@/lib/tenant-seed";
import { getStripeClient } from "@/lib/stripe";
import { sendTenantSetupEmail } from "@/lib/email";

/**
 * GET: テナント一覧取得
 * クエリパラメータ:
 *   search - 名前/slugで検索
 *   status - active|inactive|all
 *   sort   - name|created_at|patients_count
 *   page   - ページ番号（1始まり）
 *   limit  - 1ページあたりの件数
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const sort = url.searchParams.get("sort") || "created_at";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)),
    );
    const offset = (page - 1) * limit;

    // テナント一覧取得（フルクエリ → フォールバック）
    const FULL_SELECT = `
      id, name, slug, industry, is_active, contact_email, contact_phone,
      logo_url, created_at, updated_at, deleted_at,
      tenant_plans (plan_name, monthly_fee, setup_fee, started_at, next_billing_at)
    `;
    const BASIC_SELECT = "id, name, slug, is_active, created_at, updated_at";

    function applyFilters<T extends { eq: (col: string, val: unknown) => T; or: (expr: string) => T; order: (col: string, opts?: { ascending?: boolean }) => T; range: (from: number, to: number) => T }>(q: T): T {
      let filtered = q;
      if (status === "active") filtered = filtered.eq("is_active", true);
      else if (status === "inactive") filtered = filtered.eq("is_active", false);
      if (search) filtered = filtered.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      if (sort === "name") filtered = filtered.order("name", { ascending: true });
      else filtered = filtered.order("created_at", { ascending: false });
      return filtered.range(offset, offset + limit - 1);
    }

    // フルクエリを試行
    const fullQuery = supabaseAdmin.from("tenants").select(FULL_SELECT, { count: "exact" }).is("deleted_at", null);
    const fullResult = await applyFilters(fullQuery);
    let tenants: Record<string, unknown>[] | null = fullResult.data as Record<string, unknown>[] | null;
    let tenantsErr = fullResult.error;
    let count = fullResult.count;

    // フォールバック: カラムやリレーションが未作成の場合、基本カラムのみで再試行
    if (tenantsErr) {
      console.error("[platform/tenants] フルクエリ失敗（フォールバック実行）:", tenantsErr.message);
      const basicQuery = supabaseAdmin.from("tenants").select(BASIC_SELECT, { count: "exact" });
      const result = await applyFilters(basicQuery);
      tenants = result.data as Record<string, unknown>[] | null;
      tenantsErr = result.error;
      count = result.count;
    }

    if (tenantsErr) {
      console.error("[platform/tenants] GET error:", tenantsErr);
      return serverError(`テナント一覧の取得に失敗しました: ${tenantsErr.message}`);
    }

    // 各テナントの患者数と今月売上を取得（失敗しても一覧表示は維持）
    const tenantIds = (tenants || []).map((t) => String(t.id));

    let patientsCountMap: Record<string, number> = {};
    let monthlyRevenueMap: Record<string, number> = {};

    if (tenantIds.length > 0) {
      // 患者数を取得（エラー時は0のまま）
      try {
        const { data: patientCounts } = await supabaseAdmin.rpc(
          "count_patients_by_tenants",
          { tenant_ids: tenantIds },
        );
        if (patientCounts) {
          for (const row of patientCounts) {
            patientsCountMap[row.tenant_id] = row.count;
          }
        } else {
          for (const tid of tenantIds) {
            const { count: pCount } = await supabaseAdmin
              .from("patients")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tid);
            patientsCountMap[tid] = pCount || 0;
          }
        }
      } catch (e) {
        console.error("[platform/tenants] 患者数取得失敗（スキップ）:", e);
      }

      // 今月売上を取得（エラー時は0のまま）
      try {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const { data: revData } = await supabaseAdmin.rpc(
          "sum_revenue_by_tenants",
          { tenant_ids: tenantIds, since: monthStart },
        );
        if (revData) {
          for (const row of revData) {
            monthlyRevenueMap[row.tenant_id] = row.total;
          }
        } else {
          for (const tid of tenantIds) {
            const { data: orders } = await supabaseAdmin
              .from("orders")
              .select("amount")
              .eq("tenant_id", tid)
              .gte("paid_at", monthStart)
              .not("paid_at", "is", null);
            const total = (orders || []).reduce(
              (sum, o) => sum + (o.amount || 0),
              0,
            );
            monthlyRevenueMap[tid] = total;
          }
        }
      } catch (e) {
        console.error("[platform/tenants] 売上取得失敗（スキップ）:", e);
      }
    }

    // テナントデータにカウント・売上を付与
    const enriched = (tenants || []).map((t) => ({
      ...t,
      patients_count: patientsCountMap[String(t.id)] || 0,
      monthly_revenue: monthlyRevenueMap[String(t.id)] || 0,
    }));

    // patients_countでソートが必要な場合はメモリ上でソート
    if (sort === "patients_count") {
      enriched.sort((a, b) => b.patients_count - a.patients_count);
    }

    return NextResponse.json({
      ok: true,
      tenants: enriched,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[platform/tenants] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * POST: テナント新規作成
 * トランザクション:
 *   1. tenants INSERT
 *   2. admin_users INSERT（bcryptハッシュ）
 *   3. tenant_members INSERT
 *   4. tenant_plans INSERT
 *   5. tenant_settings INSERT（LINE設定がある場合）
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return forbidden("権限がありません");

  const parsed = await parseBody(req, createTenantSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;

  try {
    // slug重複チェック
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return conflict("このスラグは既に使用されています");
    }

    // メールアドレス重複チェック（同一メールでも別テナントなら許可）
    // 注: 同一テナント内での重複はtenant作成直後にチェック不要（新規テナントのため）

    // 1. テナント作成
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name,
        slug: data.slug,
        industry: data.industry || "clinic",
        contact_email: data.contactEmail || null,
        contact_phone: data.contactPhone || null,
        address: data.address || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (tenantErr || !tenant) {
      console.error("[platform/tenants] INSERT tenant error:", tenantErr);
      return serverError("テナントの作成に失敗しました");
    }

    const tenantId = tenant.id;

    // 2. 初期管理者ユーザー作成（bcryptハッシュ + ユーザーID自動生成）
    // 申し込みから作成時はDBのパスワードハッシュを利用、それ以外は平文をハッシュ化
    let passwordHash: string;
    if (data.fromApplicationId) {
      const { data: appRow } = await supabaseAdmin
        .from("applications")
        .select("admin_password_hash")
        .eq("id", data.fromApplicationId)
        .single();
      if (appRow?.admin_password_hash) {
        passwordHash = appRow.admin_password_hash;
      } else if (data.adminPassword) {
        passwordHash = await bcrypt.hash(data.adminPassword, 12);
      } else {
        return serverError("申し込みデータにパスワードが見つかりません");
      }
    } else if (data.adminPassword) {
      passwordHash = await bcrypt.hash(data.adminPassword, 12);
    } else {
      return serverError("パスワードは必須です");
    }
    const username = await generateUsername();
    const { data: adminUser, error: adminUserErr } = await supabaseAdmin
      .from("admin_users")
      .insert({
        tenant_id: tenantId,
        name: data.adminName,
        email: data.adminEmail,
        username,
        password_hash: passwordHash,
        platform_role: "tenant_admin",
        is_active: true,
      })
      .select("id, username")
      .single();

    if (adminUserErr || !adminUser) {
      console.error("[platform/tenants] INSERT admin_user error:", adminUserErr);
      // ロールバック: テナント削除
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      return serverError("管理者ユーザーの作成に失敗しました");
    }

    // 3. テナントメンバー紐付け
    const { error: memberErr } = await supabaseAdmin
      .from("tenant_members")
      .insert({
        tenant_id: tenantId,
        admin_user_id: adminUser.id,
        role: "owner",
      });

    if (memberErr) {
      console.error("[platform/tenants] INSERT tenant_member error:", memberErr);
    }

    // 4. プラン設定
    const { error: planErr } = await supabaseAdmin
      .from("tenant_plans")
      .insert({
        tenant_id: tenantId,
        plan_name: data.planName,
        monthly_fee: data.monthlyFee,
        setup_fee: data.setupFee,
        message_quota: data.messageQuota,
        overage_unit_price: data.overageUnitPrice,
        started_at: new Date().toISOString(),
      });

    if (planErr) {
      console.error("[platform/tenants] INSERT tenant_plan error:", planErr);
    }

    // 5. LINE設定（任意）— tenant_settings は category/key/value 形式
    if (data.lineChannelId || data.lineChannelSecret || data.lineAccessToken) {
      const lineSettings = [
        data.lineChannelId && { tenant_id: tenantId, category: "line", key: "channel_id", value: data.lineChannelId },
        data.lineChannelSecret && { tenant_id: tenantId, category: "line", key: "channel_secret", value: data.lineChannelSecret },
        data.lineAccessToken && { tenant_id: tenantId, category: "line", key: "access_token", value: data.lineAccessToken },
      ].filter(Boolean);

      if (lineSettings.length > 0) {
        const { error: settingsErr } = await supabaseAdmin
          .from("tenant_settings")
          .insert(lineSettings);

        if (settingsErr) {
          console.error(
            "[platform/tenants] INSERT tenant_settings error:",
            settingsErr,
          );
        }
      }
    }

    // 5.5. app_base_url をslugから自動生成
    {
      const { error: urlErr } = await supabaseAdmin
        .from("tenant_settings")
        .insert({
          tenant_id: tenantId,
          category: "general",
          key: "app_base_url",
          value: `https://${data.slug}.lope.jp`,
        });
      if (urlErr) {
        console.error("[platform/tenants] INSERT app_base_url error:", urlErr);
      }
    }

    // 6. Stripe Customer自動作成（Stripeキー設定済みの場合のみ）
    try {
      const stripe = await getStripeClient();
      if (stripe) {
        const customer = await stripe.customers.create({
          name: data.name,
          email: data.contactEmail || data.adminEmail,
          metadata: { tenant_id: tenantId, slug: data.slug },
        });
        await supabaseAdmin
          .from("tenant_plans")
          .update({ stripe_customer_id: customer.id })
          .eq("tenant_id", tenantId);
      }
    } catch (stripeErr) {
      // Stripe未設定・エラー時はスキップ（テナント作成自体は成功させる）
      console.error("[platform/tenants] Stripe Customer作成スキップ:", stripeErr);
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "create_tenant", "tenant", tenantId, {
      name: data.name,
      slug: data.slug,
      adminEmail: data.adminEmail,
      planName: data.planName,
    });

    // 初期データ自動投入（fire-and-forget）
    // テンプレート・問診フォーム・AI返信設定のデフォルトデータを非同期で投入
    seedTenantData(tenantId).catch((err) => {
      console.error(
        `[platform/tenants] 初期データ投入エラー (tenant: ${tenantId}):`,
        err,
      );
    });

    // テナント開設メール送信（fire-and-forget）
    sendTenantSetupEmail({
      to: data.adminEmail,
      adminName: data.adminName,
      tenantName: data.name,
      slug: data.slug,
      username,
    }).catch((err) => {
      console.error(
        `[platform/tenants] 開設メール送信エラー (tenant: ${tenantId}):`,
        err,
      );
    });

    return NextResponse.json(
      {
        ok: true,
        tenant: {
          id: tenantId,
          name: data.name,
          slug: data.slug,
        },
        adminUsername: adminUser.username,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[platform/tenants] POST unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
