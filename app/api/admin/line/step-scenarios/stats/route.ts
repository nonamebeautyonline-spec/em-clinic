// app/api/admin/line/step-scenarios/stats/route.ts — ステップ配信の効果測定API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * ステップ配信の統計データを返却
 * クエリパラメータ:
 *   scenario_id: 指定時は特定シナリオの詳細統計、なしは全シナリオのサマリー
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const scenarioIdParam = searchParams.get("scenario_id");

  try {
    // 特定シナリオの詳細統計
    if (scenarioIdParam) {
      const scenarioId = parseInt(scenarioIdParam);
      if (isNaN(scenarioId)) {
        return NextResponse.json({ error: "不正な scenario_id" }, { status: 400 });
      }

      const stats = await getScenarioDetailStats(scenarioId, tenantId);
      return NextResponse.json(stats);
    }

    // 全シナリオのサマリー
    const stats = await getAllScenariosStats(tenantId);
    return NextResponse.json(stats);
  } catch (e: any) {
    console.error("[step-scenarios/stats] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * 特定シナリオの詳細統計
 * - 完了率・離脱率
 * - 各ステップの到達人数（ファネル）
 * - エンロール数の月別推移
 */
async function getScenarioDetailStats(scenarioId: number, tenantId: string | null) {
  // シナリオ情報
  const { data: scenario } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id, name, total_enrolled, total_completed, is_enabled, created_at")
      .eq("id", scenarioId),
    tenantId,
  ).single();

  if (!scenario) {
    return { error: "シナリオが見つかりません" };
  }

  // 全 enrollment を取得（ステータス別カウント用）
  const { data: enrollments } = await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .select("id, status, current_step_order, enrolled_at, completed_at, exited_at, exit_reason")
      .eq("scenario_id", scenarioId),
    tenantId,
  );

  const allEnrollments = enrollments || [];
  const totalEnrolled = allEnrollments.length;
  const activeCount = allEnrollments.filter((e: any) => e.status === "active").length;
  const completedCount = allEnrollments.filter((e: any) => e.status === "completed").length;
  const exitedCount = allEnrollments.filter((e: any) => e.status === "exited").length;
  const pausedCount = allEnrollments.filter((e: any) => e.status === "paused").length;

  const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;
  const exitRate = totalEnrolled > 0 ? Math.round((exitedCount / totalEnrolled) * 100) : 0;

  // ステップ一覧を取得
  const { data: steps } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select("id, sort_order, step_type, delay_type, delay_value, content, template_id")
      .eq("scenario_id", scenarioId)
      .order("sort_order", { ascending: true }),
    tenantId,
  );

  const allSteps = steps || [];

  // 各ステップの到達人数を計算
  // current_step_order >= step.sort_order のenrollment数（通過 or 現在地）
  const funnel = allSteps.map((step: any) => {
    // そのステップに到達した人 = current_step_order >= sort_order、または完了者
    const reached = allEnrollments.filter((e: any) => {
      // 完了者は全ステップを通過
      if (e.status === "completed") return true;
      // アクティブ・離脱者は current_step_order で判定
      return e.current_step_order >= step.sort_order;
    }).length;

    return {
      sort_order: step.sort_order,
      step_type: step.step_type,
      label: getStepLabel(step),
      reached,
    };
  });

  // 離脱理由の内訳
  const exitReasons: Record<string, number> = {};
  for (const e of allEnrollments) {
    if (e.status === "exited" && e.exit_reason) {
      exitReasons[e.exit_reason] = (exitReasons[e.exit_reason] || 0) + 1;
    }
  }

  // エンロール数の月別推移（直近12ヶ月）
  const monthlyTrend = buildMonthlyTrend(allEnrollments);

  return {
    scenario: {
      id: scenario.id,
      name: scenario.name,
      is_enabled: scenario.is_enabled,
      created_at: scenario.created_at,
    },
    summary: {
      total_enrolled: totalEnrolled,
      active: activeCount,
      completed: completedCount,
      exited: exitedCount,
      paused: pausedCount,
      completion_rate: completionRate,
      exit_rate: exitRate,
    },
    funnel,
    exit_reasons: exitReasons,
    monthly_trend: monthlyTrend,
  };
}

/**
 * 全シナリオのサマリー統計
 */
async function getAllScenariosStats(tenantId: string | null) {
  const { data: scenarios } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id, name, total_enrolled, total_completed, is_enabled, created_at")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  const allScenarios = scenarios || [];

  // 全 enrollment を取得してシナリオ別に集計
  const { data: enrollments } = await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .select("scenario_id, status, enrolled_at"),
    tenantId,
  );

  const allEnrollments = enrollments || [];

  // シナリオ別の集計
  const scenarioStats = allScenarios.map((s: any) => {
    const sEnrollments = allEnrollments.filter((e: any) => e.scenario_id === s.id);
    const total = sEnrollments.length;
    const completed = sEnrollments.filter((e: any) => e.status === "completed").length;
    const exited = sEnrollments.filter((e: any) => e.status === "exited").length;
    const active = sEnrollments.filter((e: any) => e.status === "active").length;

    return {
      id: s.id,
      name: s.name,
      is_enabled: s.is_enabled,
      total_enrolled: total,
      completed,
      exited,
      active,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      exit_rate: total > 0 ? Math.round((exited / total) * 100) : 0,
    };
  });

  // 全体のエンロール月別推移
  const monthlyTrend = buildMonthlyTrend(allEnrollments);

  return {
    scenarios: scenarioStats,
    monthly_trend: monthlyTrend,
  };
}

/**
 * ステップのラベルを生成
 */
function getStepLabel(step: any): string {
  const typeLabels: Record<string, string> = {
    send_text: "テキスト送信",
    send_template: "テンプレート送信",
    tag_add: "タグ追加",
    tag_remove: "タグ削除",
    mark_change: "マーク変更",
    menu_change: "メニュー変更",
    condition: "条件分岐",
  };

  const label = typeLabels[step.step_type] || step.step_type;
  const preview = step.content ? step.content.substring(0, 30) : "";
  return preview ? `${label}: ${preview}` : label;
}

/**
 * 月別エンロール数の推移を構築（直近12ヶ月）
 */
function buildMonthlyTrend(enrollments: any[]): { month: string; enrolled: number; completed: number; exited: number }[] {
  const now = new Date();
  const months: { month: string; enrolled: number; completed: number; exited: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: yearMonth, enrolled: 0, completed: 0, exited: 0 });
  }

  for (const e of enrollments) {
    if (e.enrolled_at) {
      const ym = e.enrolled_at.substring(0, 7); // "YYYY-MM"
      const entry = months.find((m) => m.month === ym);
      if (entry) entry.enrolled++;
    }
    if (e.status === "completed" && e.completed_at) {
      const ym = e.completed_at.substring(0, 7);
      const entry = months.find((m) => m.month === ym);
      if (entry) entry.completed++;
    }
    if (e.status === "exited" && e.exited_at) {
      const ym = e.exited_at.substring(0, 7);
      const entry = months.find((m) => m.month === ym);
      if (entry) entry.exited++;
    }
  }

  return months;
}
