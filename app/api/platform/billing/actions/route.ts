// app/api/platform/billing/actions/route.ts
// 請求例外操作API（クレジット付与、請求保留/再開、メモ管理、手動停止/再開）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

type ActionType =
  | "apply_credit"
  | "hold_billing"
  | "resume_billing"
  | "add_memo"
  | "suspend_tenant"
  | "resume_tenant"
  | "apply_discount";

interface ActionBody {
  action: ActionType;
  tenantId: string;
  amount?: number;
  reason?: string;
  memo?: string;
  discountPercent?: number;
  discountMonths?: number;
}

export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const { action, tenantId } = body;
  if (!tenantId) return badRequest("tenantIdは必須です");

  try {
    // テナント存在確認
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name, is_active, suspended_at")
      .eq("id", tenantId)
      .single();

    if (!tenant) return notFound("テナントが見つかりません");

    switch (action) {
      case "apply_credit": {
        // クレジット（値引き）を次回請求に適用
        const amount = body.amount;
        if (!amount || amount <= 0) return badRequest("金額は正の数で指定してください");

        const { error } = await supabaseAdmin
          .from("billing_credits")
          .insert({
            tenant_id: tenantId,
            amount,
            reason: body.reason || "プラットフォーム管理者による付与",
            applied_by: admin.name,
            status: "pending",
          });

        if (error) {
          // テーブルが存在しない場合はtenant_plansのnotesに記録
          const { data: plan } = await supabaseAdmin
            .from("tenant_plans")
            .select("notes")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          const creditNote = `[${new Date().toISOString().slice(0, 10)}] クレジット ¥${amount.toLocaleString()} 付与 (${body.reason || "手動"}) by ${admin.name}`;
          const newNotes = plan?.notes ? `${plan.notes}\n${creditNote}` : creditNote;

          await supabaseAdmin
            .from("tenant_plans")
            .update({ notes: newNotes, updated_at: new Date().toISOString() })
            .eq("tenant_id", tenantId);
        }

        logAudit(req, "platform.billing.credit", "tenant", tenantId, {
          amount,
          reason: body.reason,
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: `¥${amount.toLocaleString()}のクレジットを付与しました` });
      }

      case "hold_billing": {
        // 請求保留（次回請求をスキップ）
        const { error } = await supabaseAdmin
          .from("tenant_plans")
          .update({
            billing_hold: true,
            billing_hold_reason: body.reason || "プラットフォーム管理者による保留",
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        if (error) {
          console.error("[billing/actions] hold_billing error:", error);
          return serverError("請求保留の設定に失敗しました");
        }

        logAudit(req, "platform.billing.hold", "tenant", tenantId, {
          reason: body.reason,
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: "請求を保留にしました" });
      }

      case "resume_billing": {
        // 請求再開
        const { error } = await supabaseAdmin
          .from("tenant_plans")
          .update({
            billing_hold: false,
            billing_hold_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        if (error) {
          console.error("[billing/actions] resume_billing error:", error);
          return serverError("請求再開に失敗しました");
        }

        logAudit(req, "platform.billing.resume", "tenant", tenantId, {
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: "請求を再開しました" });
      }

      case "add_memo": {
        // 回収メモ追加
        if (!body.memo) return badRequest("メモ内容は必須です");

        const { data: plan } = await supabaseAdmin
          .from("tenant_plans")
          .select("notes")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const memoLine = `[${new Date().toISOString().slice(0, 10)}] ${body.memo} (${admin.name})`;
        const newNotes = plan?.notes ? `${plan.notes}\n${memoLine}` : memoLine;

        await supabaseAdmin
          .from("tenant_plans")
          .update({ notes: newNotes, updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId);

        logAudit(req, "platform.billing.memo", "tenant", tenantId, {
          memo: body.memo,
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: "メモを追加しました" });
      }

      case "suspend_tenant": {
        // テナント手動停止
        const { error } = await supabaseAdmin
          .from("tenants")
          .update({
            is_active: false,
            suspended_at: new Date().toISOString(),
            suspend_reason: body.reason || "プラットフォーム管理者による手動停止",
          })
          .eq("id", tenantId);

        if (error) {
          console.error("[billing/actions] suspend error:", error);
          return serverError("テナントの停止に失敗しました");
        }

        logAudit(req, "platform.tenant.suspend", "tenant", tenantId, {
          reason: body.reason,
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: "テナントを停止しました" });
      }

      case "resume_tenant": {
        // テナント再開
        const { error } = await supabaseAdmin
          .from("tenants")
          .update({
            is_active: true,
            suspended_at: null,
            suspend_reason: null,
          })
          .eq("id", tenantId);

        if (error) {
          console.error("[billing/actions] resume error:", error);
          return serverError("テナントの再開に失敗しました");
        }

        logAudit(req, "platform.tenant.resume", "tenant", tenantId, {
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: "テナントを再開しました" });
      }

      case "apply_discount": {
        // 期間限定値引き
        const percent = body.discountPercent;
        const months = body.discountMonths || 1;
        if (!percent || percent <= 0 || percent > 100) {
          return badRequest("割引率は1〜100%で指定してください");
        }

        const discountNote = `[${new Date().toISOString().slice(0, 10)}] ${percent}%割引 ${months}ヶ月適用 (${body.reason || "手動"}) by ${admin.name}`;
        const { data: plan } = await supabaseAdmin
          .from("tenant_plans")
          .select("notes")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const newNotes = plan?.notes ? `${plan.notes}\n${discountNote}` : discountNote;
        await supabaseAdmin
          .from("tenant_plans")
          .update({
            discount_percent: percent,
            discount_expires_at: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: newNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        logAudit(req, "platform.billing.discount", "tenant", tenantId, {
          percent,
          months,
          reason: body.reason,
          tenantName: tenant.name,
        });

        return NextResponse.json({ ok: true, message: `${percent}%割引を${months}ヶ月適用しました` });
      }

      default:
        return badRequest("不明なアクションです");
    }
  } catch (err) {
    console.error("[billing/actions] Error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
