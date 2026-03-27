// app/api/platform/usage/export/route.ts
// 利用統計CSVエクスポートAPI
// 全テナントの当月使用量をCSVでダウンロード

import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  // クエリパラメータから対象月を取得（デフォルト: 当月）
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // YYYY-MM形式

  let targetMonth: string;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    targetMonth = `${monthParam}-01`;
  } else {
    const now = new Date();
    targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  try {
    // monthly_usage + テナント名 + プラン情報を結合取得
    const { data: usageData, error } = await supabaseAdmin
      .from("monthly_usage")
      .select(`
        tenant_id,
        month,
        message_count,
        broadcast_count,
        overage_count,
        overage_amount,
        invoice_generated,
        tenants (
          name,
          slug
        )
      `)
      .eq("month", targetMonth)
      .order("message_count", { ascending: false });

    if (error) {
      console.error("[platform/usage/export] クエリエラー:", error);
      return serverError("使用量データの取得に失敗しました");
    }

    // プラン情報を別途取得
    const tenantIds = (usageData || []).map((u) => u.tenant_id);
    const { data: plans } = await supabaseAdmin
      .from("tenant_plans")
      .select("tenant_id, plan_name, monthly_fee, message_quota, overage_unit_price")
      .in("tenant_id", tenantIds.length > 0 ? tenantIds : ["__none__"]);

    const planMap = new Map(
      (plans || []).map((p) => [p.tenant_id, p]),
    );

    // CSVヘッダー
    const headers = [
      "テナント名",
      "スラグ",
      "対象月",
      "プラン名",
      "月額(円)",
      "メッセージ上限",
      "送信数",
      "ブロードキャスト数",
      "超過数",
      "超過単価(円)",
      "超過金額(円)",
      "請求書生成済み",
    ];

    // CSV行を構築
    const rows = (usageData || []).map((u) => {
      const tenant = u.tenants as unknown as { name: string; slug: string } | null;
      const plan = planMap.get(u.tenant_id);
      const monthStr = targetMonth.slice(0, 7); // YYYY-MM

      return [
        csvEscape(tenant?.name || ""),
        csvEscape(tenant?.slug || ""),
        monthStr,
        csvEscape(plan?.plan_name || ""),
        plan?.monthly_fee || 0,
        plan?.message_quota || 0,
        u.message_count || 0,
        u.broadcast_count || 0,
        u.overage_count || 0,
        plan?.overage_unit_price || 0,
        u.overage_amount || 0,
        u.invoice_generated ? "済" : "未",
      ].join(",");
    });

    // BOM + CSV文字列
    const bom = "\uFEFF";
    const csv = bom + headers.join(",") + "\n" + rows.join("\n");

    // 監査ログ
    logAudit(req, "export_usage_csv", "monthly_usage", targetMonth, {
      month: targetMonth.slice(0, 7),
      tenantCount: rows.length,
      exportedBy: admin.name,
    });

    const filename = `usage-${targetMonth.slice(0, 7)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[platform/usage/export] エラー:", err);
    return serverError("CSVエクスポートに失敗しました");
  }
}

/** CSV用エスケープ: ダブルクォートとカンマに対応 */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
