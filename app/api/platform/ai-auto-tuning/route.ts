// AI Auto-Tuning API: 最適化提案の管理
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import {
  analyzeTenantPerformance,
  generateTuningSuggestions,
  listSuggestions,
  applySuggestion,
  rejectSuggestion,
} from "@/lib/ai-auto-tuning";
import {
  getSourceWeights,
  setSourceWeight,
  listAllSourceWeights,
} from "@/lib/ai-source-weights";

/**
 * GET: 最適化提案一覧 + ソース重み
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type"); // "suggestions" | "weights"

  try {
    if (type === "weights") {
      // ソース重み一覧
      const workflowType = url.searchParams.get("workflow_type") || "line-reply";
      if (tenantId) {
        const weights = await getSourceWeights(tenantId, workflowType);
        return NextResponse.json({ ok: true, weights });
      }
      const allWeights = await listAllSourceWeights(tenantId);
      return NextResponse.json({ ok: true, weights: allWeights });
    }

    // デフォルト: 提案一覧
    const suggestions = await listSuggestions(tenantId, status);
    return NextResponse.json({ ok: true, suggestions });
  } catch (err) {
    console.error("[AI Auto-Tuning] GET エラー:", err);
    return serverError("データの取得に失敗しました");
  }
}

/**
 * POST: アクション実行
 * - action: "analyze" → パフォーマンス分析 + 提案生成
 * - action: "apply" → 提案適用
 * - action: "reject" → 提案却下
 * - action: "set_weight" → ソース重み設定
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  const { action } = body || {};

  try {
    switch (action) {
      case "analyze": {
        const { tenant_id, days } = body;
        if (!tenant_id) return badRequest("tenant_id は必須です");

        const performance = await analyzeTenantPerformance(tenant_id, days || 30);
        const suggestions = await generateTuningSuggestions(tenant_id, performance);

        logAudit(req, "ai_tuning.analyze", "ai_tuning_suggestions", tenant_id, {
          total_tasks: performance.totalTasks,
          suggestions_count: suggestions.length,
        });

        return NextResponse.json({
          ok: true,
          performance,
          suggestions,
        });
      }

      case "apply": {
        const { suggestion_id } = body;
        if (!suggestion_id) return badRequest("suggestion_id は必須です");

        const success = await applySuggestion(suggestion_id);
        if (!success) return serverError("提案の適用に失敗しました");

        logAudit(req, "ai_tuning.apply", "ai_tuning_suggestions", String(suggestion_id));

        return NextResponse.json({ ok: true });
      }

      case "reject": {
        const { suggestion_id } = body;
        if (!suggestion_id) return badRequest("suggestion_id は必須です");

        const success = await rejectSuggestion(suggestion_id);
        if (!success) return serverError("提案の却下に失敗しました");

        logAudit(req, "ai_tuning.reject", "ai_tuning_suggestions", String(suggestion_id));

        return NextResponse.json({ ok: true });
      }

      case "set_weight": {
        const { tenant_id, workflow_type, source_type, weight } = body;
        if (!tenant_id || !workflow_type || !source_type || weight === undefined) {
          return badRequest("tenant_id, workflow_type, source_type, weight は必須です");
        }
        if (typeof weight !== "number" || weight < 0 || weight > 2) {
          return badRequest("weight は 0〜2 の数値です");
        }

        await setSourceWeight(tenant_id, workflow_type, source_type, weight);

        logAudit(req, "ai_source_weight.update", "ai_source_weights", tenant_id, {
          workflow_type,
          source_type,
          weight,
        });

        return NextResponse.json({ ok: true });
      }

      default:
        return badRequest("action は analyze / apply / reject / set_weight のいずれかです");
    }
  } catch (err) {
    console.error("[AI Auto-Tuning] POST エラー:", err);
    return serverError("処理に失敗しました");
  }
}
