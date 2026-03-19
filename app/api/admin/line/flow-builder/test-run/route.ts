// app/api/admin/line/flow-builder/test-run/route.ts — フローのドライラン（テスト実行）
import { NextRequest, NextResponse } from "next/server";
import { serverError, badRequest, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, resolveTenantIdOrThrow } from "@/lib/tenant";
import { evaluateStepConditions, type ConditionRule } from "@/lib/step-enrollment";
import { evaluateDisplayConditions, type DisplayConditions } from "@/lib/step-conditions";

interface TestRunStep {
  nodeId: string;
  stepOrder: number;
  stepType: string;
  action: string;       // 実行されたアクション
  result: "executed" | "skipped" | "branched" | "exited" | "completed";
  detail: string;       // 結果の説明
  branchLabel?: string; // 分岐先のラベル
}

export async function POST(request: NextRequest) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(request);
    const body = await request.json();
    const { scenario_id, patient_id } = body;

    if (!scenario_id) return badRequest("scenario_id は必須です");
    if (!patient_id) return badRequest("patient_id は必須です");

    // 患者存在確認
    const { data: patient } = await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id, name")
        .eq("patient_id", patient_id)
        .maybeSingle(),
      tenantId,
    );
    if (!patient) return badRequest("指定された患者が見つかりません");

    // シナリオのステップ一覧を取得
    const { data: steps, error } = await strictWithTenant(
      supabaseAdmin
        .from("step_items")
        .select("*")
        .eq("scenario_id", scenario_id)
        .order("sort_order", { ascending: true }),
      tenantId,
    );
    if (error) return serverError(error.message);
    if (!steps || steps.length === 0) {
      return NextResponse.json({ results: [], message: "ステップがありません" });
    }

    // ステップを順番に疑似実行（最大50ステップ、無限ループ防止）
    const results: TestRunStep[] = [];
    let currentOrder = steps[0].sort_order;
    let iteration = 0;
    const MAX_ITERATIONS = 50;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      const step = steps.find((s: Record<string, unknown>) => s.sort_order === currentOrder);
      if (!step) {
        results.push({
          nodeId: `node-end`,
          stepOrder: currentOrder,
          stepType: "end",
          action: "フロー完了",
          result: "completed",
          detail: "全ステップ完了",
        });
        break;
      }

      const nodeId = `node-${steps.indexOf(step)}`;

      // 離脱条件チェック
      const exitRules = step.exit_condition_rules;
      if (exitRules && Array.isArray(exitRules) && exitRules.length > 0) {
        const exitMatch = await evaluateStepConditions(exitRules as ConditionRule[], patient_id, tenantId);
        if (exitMatch) {
          const exitAction = step.exit_action || "exit";
          if (exitAction === "exit") {
            results.push({
              nodeId,
              stepOrder: currentOrder,
              stepType: step.step_type,
              action: "離脱条件に一致",
              result: "exited",
              detail: "離脱条件に一致 → シナリオ離脱",
            });
            break;
          } else if (exitAction === "skip") {
            results.push({
              nodeId,
              stepOrder: currentOrder,
              stepType: step.step_type,
              action: "離脱条件に一致",
              result: "skipped",
              detail: "離脱条件に一致 → スキップ",
            });
            currentOrder = findNextOrder(steps, currentOrder);
            continue;
          } else if (exitAction === "jump" && step.exit_jump_to != null) {
            results.push({
              nodeId,
              stepOrder: currentOrder,
              stepType: step.step_type,
              action: "離脱条件に一致",
              result: "branched",
              detail: `離脱条件に一致 → ステップ${step.exit_jump_to}にジャンプ`,
            });
            currentOrder = step.exit_jump_to;
            continue;
          }
        }
      }

      // 表示条件チェック
      if (step.display_conditions) {
        const dcContext = await buildSimpleContext(patient_id, tenantId);
        const shouldDisplay = evaluateDisplayConditions(step.display_conditions as DisplayConditions, dcContext);
        if (!shouldDisplay) {
          results.push({
            nodeId,
            stepOrder: currentOrder,
            stepType: step.step_type,
            action: "表示条件不一致",
            result: "skipped",
            detail: "表示条件を満たさない → スキップ",
          });
          currentOrder = findNextOrder(steps, currentOrder);
          continue;
        }
      }

      // 条件分岐
      if (step.step_type === "condition") {
        const branches = step.branches as { label?: string; condition_rules?: unknown[]; next_step?: number | null }[] | null;
        if (branches && Array.isArray(branches) && branches.length > 0) {
          let branchResult = "デフォルト分岐";
          let nextStep: number | null = null;
          for (const branch of branches) {
            const rules = branch.condition_rules;
            if (!rules || !Array.isArray(rules) || rules.length === 0) {
              branchResult = branch.label || "デフォルト";
              nextStep = branch.next_step ?? null;
              break;
            }
            const match = await evaluateStepConditions(rules as ConditionRule[], patient_id, tenantId);
            if (match) {
              branchResult = branch.label || "条件一致";
              nextStep = branch.next_step ?? null;
              break;
            }
          }
          results.push({
            nodeId,
            stepOrder: currentOrder,
            stepType: "condition",
            action: "条件分岐",
            result: "branched",
            detail: `条件評価: ${branchResult}`,
            branchLabel: branchResult,
          });
          currentOrder = nextStep ?? findNextOrder(steps, currentOrder);
          continue;
        }

        // 旧2分岐
        const condRules = step.condition_rules;
        if (condRules && Array.isArray(condRules) && condRules.length > 0) {
          const match = await evaluateStepConditions(condRules as ConditionRule[], patient_id, tenantId);
          results.push({
            nodeId,
            stepOrder: currentOrder,
            stepType: "condition",
            action: "条件分岐",
            result: "branched",
            detail: match ? "条件一致 → True分岐" : "条件不一致 → False分岐",
            branchLabel: match ? "True" : "False",
          });
          if (match && step.branch_true_step != null) {
            currentOrder = step.branch_true_step;
          } else if (!match && step.branch_false_step != null) {
            currentOrder = step.branch_false_step;
          } else {
            currentOrder = findNextOrder(steps, currentOrder);
          }
          continue;
        }

        results.push({
          nodeId,
          stepOrder: currentOrder,
          stepType: "condition",
          action: "条件分岐",
          result: "skipped",
          detail: "条件未設定 → 次のステップへ",
        });
        currentOrder = findNextOrder(steps, currentOrder);
        continue;
      }

      // A/Bテスト
      if (step.step_type === "ab_test") {
        const variants = step.ab_variants as { label?: string; weight: number; next_step?: number | null }[] | null;
        if (variants && Array.isArray(variants) && variants.length >= 2) {
          const totalWeight = variants.reduce((s: number, v: { weight: number }) => s + (v.weight || 0), 0);
          const rand = Math.random() * totalWeight;
          let cumulative = 0;
          let selectedIdx = 0;
          for (let vi = 0; vi < variants.length; vi++) {
            cumulative += variants[vi].weight || 0;
            if (rand < cumulative) { selectedIdx = vi; break; }
          }
          const selected = variants[selectedIdx];
          results.push({
            nodeId,
            stepOrder: currentOrder,
            stepType: "ab_test",
            action: "A/Bテスト",
            result: "branched",
            detail: `バリアント ${selected.label || String.fromCharCode(65 + selectedIdx)} (${Math.round((selected.weight / totalWeight) * 100)}%) に振り分け`,
            branchLabel: selected.label || String.fromCharCode(65 + selectedIdx),
          });
          currentOrder = selected.next_step ?? findNextOrder(steps, currentOrder);
          continue;
        }
        results.push({
          nodeId,
          stepOrder: currentOrder,
          stepType: "ab_test",
          action: "A/Bテスト",
          result: "skipped",
          detail: "バリアント未設定 → 次のステップへ",
        });
        currentOrder = findNextOrder(steps, currentOrder);
        continue;
      }

      // 通常ステップ（ドライラン: 実際には実行しない）
      let actionText = "";
      let detailText = "";
      switch (step.step_type) {
        case "send_text":
          actionText = "テキスト送信（ドライラン）";
          detailText = step.content
            ? `メッセージ: "${(step.content as string).substring(0, 50)}..."`
            : "メッセージ未設定";
          break;
        case "send_template":
          actionText = "テンプレート送信（ドライラン）";
          detailText = step.template_id ? `テンプレートID: ${step.template_id}` : "テンプレート未設定";
          break;
        case "tag_add":
          actionText = "タグ追加（ドライラン）";
          detailText = step.tag_id ? `タグID: ${step.tag_id}` : "タグ未設定";
          break;
        case "tag_remove":
          actionText = "タグ除去（ドライラン）";
          detailText = step.tag_id ? `タグID: ${step.tag_id}` : "タグ未設定";
          break;
        case "mark_change":
          actionText = "マーク変更（ドライラン）";
          detailText = step.mark ? `マーク: ${step.mark}` : "マーク未設定";
          break;
        case "menu_change":
          actionText = "メニュー変更（ドライラン）";
          detailText = step.menu_id ? `メニューID: ${step.menu_id}` : "メニュー未設定";
          break;
        default:
          actionText = `${step.step_type}（ドライラン）`;
          detailText = "実行シミュレーション";
      }

      results.push({
        nodeId,
        stepOrder: currentOrder,
        stepType: step.step_type,
        action: actionText,
        result: "executed",
        detail: detailText,
      });

      currentOrder = findNextOrder(steps, currentOrder);
    }

    if (iteration >= MAX_ITERATIONS) {
      results.push({
        nodeId: "overflow",
        stepOrder: -1,
        stepType: "error",
        action: "反復制限超過",
        result: "exited",
        detail: `最大反復回数(${MAX_ITERATIONS})に到達 — ループの可能性があります`,
      });
    }

    return NextResponse.json({
      patient: { patient_id: patient.patient_id, name: patient.name },
      results,
      total_steps: results.length,
    });
  } catch (e) {
    return serverError((e as Error).message);
  }
}

/** 次のsort_orderを探す */
function findNextOrder(steps: Record<string, unknown>[], currentOrder: number): number {
  const next = steps.find((s) => (s.sort_order as number) > currentOrder);
  return next ? (next.sort_order as number) : currentOrder + 9999; // 見つからない場合は存在しない値
}

/** 簡易コンテキスト構築（display_conditions用） */
async function buildSimpleContext(
  patientId: string,
  tenantId: string | null,
): Promise<import("@/lib/step-conditions").DisplayConditionContext> {
  const { data: tagRows } = await strictWithTenant(
    supabaseAdmin
      .from("patient_tags")
      .select("tag_definitions!inner(name)")
      .eq("patient_id", patientId),
    tenantId,
  );
  const tags = (tagRows || []).map((r: Record<string, unknown>) => {
    const td = r.tag_definitions as Record<string, unknown> | null;
    return String(td?.name ?? "");
  }).filter(Boolean);

  return { tags, customFields: {}, daysSinceStart: 0, completedSteps: [] };
}
