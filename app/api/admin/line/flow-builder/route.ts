// app/api/admin/line/flow-builder/route.ts
// フロービルダーAPI: step_items をフローグラフ形式で取得・保存
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// step_items のフィールド定義（フロー変換に必要な全カラム）
const STEP_ITEM_COLUMNS = `
  id, scenario_id, sort_order,
  delay_type, delay_value, send_time,
  step_type, content, template_id, tag_id, mark, menu_id,
  condition_rules, branch_true_step, branch_false_step,
  exit_condition_rules, exit_action, exit_jump_to
`;

/**
 * GET: シナリオIDを指定してstep_itemsを取得し、フローグラフ形式で返す
 * クエリパラメータ: scenario_id (必須)
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenario_id");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenario_id は必須です" }, { status: 400 });
  }

  // シナリオ存在確認
  const { data: scenario, error: scenarioError } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id, name")
      .eq("id", parseInt(scenarioId)),
    tenantId
  ).single();

  if (scenarioError || !scenario) {
    return NextResponse.json({ error: "シナリオが見つかりません" }, { status: 404 });
  }

  // step_items 取得
  const { data: items, error: itemsError } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select(STEP_ITEM_COLUMNS)
      .eq("scenario_id", parseInt(scenarioId))
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // サーバーサイドでフロー変換（stepsToFlowGraphはクライアントモジュールなので、シンプルに返す）
  // クライアント側で stepsToFlowGraph を使って変換する
  // ただし、APIレスポンスはフローグラフ形式も含める
  const steps = items || [];
  const graph = convertStepsToGraph(steps);

  return NextResponse.json({
    scenario: { id: scenario.id, name: scenario.name },
    steps,
    graph,
  });
}

/**
 * PUT: フローデータを受け取り、step_itemsに変換して保存
 * リクエストボディ: { scenario_id, graph }
 */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { scenario_id, graph } = body;

  if (!scenario_id) {
    return NextResponse.json({ error: "scenario_id は必須です" }, { status: 400 });
  }

  if (!graph || !Array.isArray(graph.nodes)) {
    return NextResponse.json({ error: "graph データが不正です" }, { status: 400 });
  }

  // シナリオ存在確認
  const { data: scenario, error: scenarioError } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id")
      .eq("id", scenario_id),
    tenantId
  ).single();

  if (scenarioError || !scenario) {
    return NextResponse.json({ error: "シナリオが見つかりません" }, { status: 404 });
  }

  // フローグラフ → step_items に変換
  const steps = convertGraphToSteps(graph);

  // 既存 step_items を全削除
  const { error: deleteError } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .delete()
      .eq("scenario_id", scenario_id),
    tenantId
  );

  if (deleteError) {
    return NextResponse.json({ error: "既存ステップの削除に失敗しました: " + deleteError.message }, { status: 500 });
  }

  // 新しい step_items を挿入
  if (steps.length > 0) {
    const stepRows = steps.map((s: any, i: number) => ({
      ...tenantPayload(tenantId),
      scenario_id,
      sort_order: i,
      delay_type: s.delay_type || "days",
      delay_value: s.delay_value ?? 1,
      send_time: s.send_time || null,
      step_type: s.step_type || "send_text",
      content: s.content || null,
      template_id: s.template_id || null,
      tag_id: s.tag_id || null,
      mark: s.mark || null,
      menu_id: s.menu_id || null,
      condition_rules: s.condition_rules || [],
      branch_true_step: s.branch_true_step ?? null,
      branch_false_step: s.branch_false_step ?? null,
      exit_condition_rules: s.exit_condition_rules || [],
      exit_action: s.exit_action || "exit",
      exit_jump_to: s.exit_jump_to ?? null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("step_items")
      .insert(stepRows);

    if (insertError) {
      return NextResponse.json({ error: "ステップの保存に失敗しました: " + insertError.message }, { status: 500 });
    }
  }

  // updated_at を更新
  await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", scenario_id),
    tenantId
  );

  return NextResponse.json({ ok: true, step_count: steps.length });
}

/* ========================================
   サーバーサイド変換関数
   （flow-converter.ts はクライアントモジュールのため、APIで直接使わず再実装）
   ======================================== */

/** ノードの幅・高さのデフォルト値 */
const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const NODE_GAP_Y = 140;
const NODE_GAP_X = 300;
const START_X = 100;
const START_Y = 80;

/** step_type からノードタイプへの変換 */
function getNodeType(stepType: string): string {
  switch (stepType) {
    case "send_text":
    case "send_template":
      return "send";
    case "condition":
      return "condition";
    case "tag_add":
    case "tag_remove":
    case "mark_change":
      return "tag";
    case "menu_change":
      return "menu";
    default:
      return "send";
  }
}

/** step_items → フローグラフへ変換（サーバーサイド版） */
function convertStepsToGraph(items: any[]): { nodes: any[]; edges: any[] } {
  if (!items || items.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: any[] = [];
  const edges: any[] = [];
  const branchOffsets = new Map<number, number>();

  items.forEach((item, index) => {
    const nodeId = `node-${index}`;
    const nodeType = getNodeType(item.step_type);
    const isCondition = item.step_type === "condition";

    // X位置: 分岐オフセット考慮
    const xOffset = branchOffsets.get(index) || 0;
    const x = START_X + xOffset;
    const y = START_Y + index * NODE_GAP_Y;

    // 待機ノード（delay_value > 0 かつ条件分岐でない場合）
    const hasWait = !isCondition && item.delay_value > 0;

    if (hasWait) {
      const waitId = `wait-${index}`;
      const unit = item.delay_type === "minutes" ? "分" : item.delay_type === "hours" ? "時間" : "日";
      let waitLabel = `${item.delay_value}${unit}後`;
      if (item.delay_type === "days" && item.send_time) waitLabel += ` ${item.send_time}`;

      nodes.push({
        id: waitId,
        type: "wait",
        label: waitLabel,
        x,
        y: y - NODE_GAP_Y / 3,
        width: NODE_WIDTH,
        height: 50,
        data: {
          step_type: "wait",
          delay_type: item.delay_type,
          delay_value: item.delay_value,
          send_time: item.send_time,
          content: null,
          template_id: null,
          tag_id: null,
          mark: null,
          menu_id: null,
          condition_rules: [],
          branch_true_step: null,
          branch_false_step: null,
          exit_condition_rules: [],
          exit_action: "exit",
          exit_jump_to: null,
        },
      });

      // 前ノードとの接続
      if (index > 0 && items[index - 1].step_type !== "condition") {
        edges.push({
          id: `edge-node-${index - 1}-${waitId}`,
          from: `node-${index - 1}`,
          to: waitId,
          fromPort: "bottom",
          toPort: "top",
        });
      }

      // 待機→メインノード
      edges.push({
        id: `edge-${waitId}-${nodeId}`,
        from: waitId,
        to: nodeId,
        fromPort: "bottom",
        toPort: "top",
      });
    } else if (index > 0 && items[index - 1].step_type !== "condition") {
      edges.push({
        id: `edge-node-${index - 1}-${nodeId}`,
        from: `node-${index - 1}`,
        to: nodeId,
        fromPort: "bottom",
        toPort: "top",
      });
    }

    // ラベル構築
    const typeLabels: Record<string, string> = {
      send_text: "テキスト送信",
      send_template: "テンプレート送信",
      condition: "条件分岐",
      tag_add: "タグ追加",
      tag_remove: "タグ除去",
      mark_change: "マーク変更",
      menu_change: "メニュー変更",
    };
    let label = typeLabels[item.step_type] || item.step_type;
    if (item.step_type === "send_text" && item.content) {
      label += `\n${item.content.substring(0, 30)}${item.content.length > 30 ? "..." : ""}`;
    }
    if (item.step_type === "condition" && item.condition_rules?.length > 0) {
      label += `\n${item.condition_rules.length}件の条件`;
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      label,
      x,
      y,
      width: NODE_WIDTH,
      height: isCondition ? 100 : NODE_HEIGHT,
      data: {
        step_type: item.step_type,
        delay_type: item.delay_type || "days",
        delay_value: item.delay_value ?? 1,
        send_time: item.send_time || null,
        content: item.content || null,
        template_id: item.template_id || null,
        tag_id: item.tag_id || null,
        mark: item.mark || null,
        menu_id: item.menu_id || null,
        condition_rules: item.condition_rules || [],
        branch_true_step: item.branch_true_step ?? null,
        branch_false_step: item.branch_false_step ?? null,
        exit_condition_rules: item.exit_condition_rules || [],
        exit_action: item.exit_action || "exit",
        exit_jump_to: item.exit_jump_to ?? null,
      },
    });

    // 条件分岐のエッジ
    if (isCondition) {
      const trueTarget = item.branch_true_step;
      const falseTarget = item.branch_false_step;

      if (trueTarget !== null && trueTarget !== undefined && trueTarget < items.length) {
        edges.push({
          id: `edge-${nodeId}-true`,
          from: nodeId,
          to: `node-${trueTarget}`,
          fromPort: "true",
          toPort: "top",
          label: "True",
          color: "#22c55e",
        });
      } else if (index + 1 < items.length) {
        edges.push({
          id: `edge-${nodeId}-true`,
          from: nodeId,
          to: `node-${index + 1}`,
          fromPort: "true",
          toPort: "top",
          label: "True",
          color: "#22c55e",
        });
      }

      if (falseTarget !== null && falseTarget !== undefined && falseTarget < items.length) {
        edges.push({
          id: `edge-${nodeId}-false`,
          from: nodeId,
          to: `node-${falseTarget}`,
          fromPort: "false",
          toPort: "top",
          label: "False",
          color: "#ef4444",
        });
        branchOffsets.set(falseTarget, NODE_GAP_X);
      }
    }
  });

  return { nodes, edges };
}

/** フローグラフ → step_items に変換（サーバーサイド版） */
function convertGraphToSteps(graph: { nodes: any[]; edges: any[] }): any[] {
  // wait ノードを除外し、sort_order 順でソート
  const mainNodes = graph.nodes
    .filter((n: any) => n.type !== "wait")
    .sort((a: any, b: any) => {
      const aIdx = parseInt(a.id.replace("node-", ""));
      const bIdx = parseInt(b.id.replace("node-", ""));
      return aIdx - bIdx;
    });

  return mainNodes.map((node: any, sortOrder: number) => {
    const data = node.data || {};

    // 待機ノードから delay 情報を取得
    const waitNodeId = `wait-${node.id.replace("node-", "")}`;
    const waitNode = graph.nodes.find((n: any) => n.id === waitNodeId && n.type === "wait");

    const delayType = waitNode?.data?.delay_type || data.delay_type || "days";
    const delayValue = waitNode?.data?.delay_value ?? data.delay_value ?? 1;
    const sendTime = waitNode?.data?.send_time || data.send_time || null;

    // 条件分岐のエッジから分岐先を解決
    let branchTrueStep = data.branch_true_step;
    let branchFalseStep = data.branch_false_step;

    if (data.step_type === "condition") {
      const trueEdge = graph.edges.find((e: any) => e.from === node.id && e.fromPort === "true");
      const falseEdge = graph.edges.find((e: any) => e.from === node.id && e.fromPort === "false");

      if (trueEdge) {
        const targetIdx = parseInt(trueEdge.to.replace("node-", ""));
        branchTrueStep = isNaN(targetIdx) ? null : targetIdx;
      }
      if (falseEdge) {
        const targetIdx = parseInt(falseEdge.to.replace("node-", ""));
        branchFalseStep = isNaN(targetIdx) ? null : targetIdx;
      }
    }

    return {
      sort_order: sortOrder,
      step_type: data.step_type === "wait" ? "send_text" : data.step_type,
      delay_type: delayType,
      delay_value: delayValue,
      send_time: sendTime,
      content: data.content || null,
      template_id: data.template_id || null,
      tag_id: data.tag_id || null,
      mark: data.mark || null,
      menu_id: data.menu_id || null,
      condition_rules: data.condition_rules || [],
      branch_true_step: branchTrueStep ?? null,
      branch_false_step: branchFalseStep ?? null,
      exit_condition_rules: data.exit_condition_rules || [],
      exit_action: data.exit_action || "exit",
      exit_jump_to: data.exit_jump_to ?? null,
    };
  });
}
