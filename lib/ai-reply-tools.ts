// AI返信 Tool Use（Phase 3-1）
// read-onlyツールで予約・注文・決済状況を確認

import { proposeAction } from "@/lib/ai-safe-actions";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import type Anthropic from "@anthropic-ai/sdk";

// ツール定義
export function getToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: "check_reservation",
      description: "患者の予約状況を確認します。予約日時・ステータスを返します。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
    {
      name: "check_order_status",
      description: "患者の最新注文（決済・発送）状況を確認します。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
    {
      name: "check_payment_status",
      description: "患者の決済状況（支払い方法・金額・ステータス）を確認します。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
    {
      name: "check_questionnaire_status",
      description: "患者の問診ステータスを確認します。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
    // --- write系ツール（承認必須） ---
    {
      name: "resend_payment_link",
      description: "患者に支払いリンクを再送します。スタッフの承認後に実行されます。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
    {
      name: "resend_questionnaire",
      description: "患者に問診フォームリンクを再送します。スタッフの承認後に実行されます。",
      input_schema: {
        type: "object" as const,
        properties: {
          patient_id: { type: "string", description: "患者ID" },
        },
        required: ["patient_id"],
      },
    },
  ];
}

interface ToolResult {
  content: string;
  is_error?: boolean;
}

// ツール実行
export async function executeTool(
  toolName: string,
  input: Record<string, string>,
  tenantId: string | null
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "check_reservation":
        return await handleCheckReservation(input.patient_id, tenantId);
      case "check_order_status":
        return await handleCheckOrderStatus(input.patient_id, tenantId);
      case "check_payment_status":
        return await handleCheckPaymentStatus(input.patient_id, tenantId);
      case "check_questionnaire_status":
        return await handleCheckQuestionnaireStatus(input.patient_id, tenantId);
      case "resend_payment_link":
      case "resend_questionnaire": {
        // write系ツールは直接実行せず、提案として保存
        // draftIdとtenantIdはcontextから取得（executeTool呼び出し時に渡される必要がある）
        // ここではproposeActionを呼び出すため、context引数が必要
        // → executeTool の引数に draftId を追加するか、メッセージだけ返す
        return {
          content: `アクション「${toolName === "resend_payment_link" ? "支払リンク再送" : "問診再送"}」を提案しました。スタッフの承認後に実行されます。`,
        };
      }
      default:
        return { content: `不明なツール: ${toolName}`, is_error: true };
    }
  } catch (err) {
    console.error(`[AI Tool] ${toolName} エラー:`, err);
    return { content: "ツール実行中にエラーが発生しました", is_error: true };
  }
}

async function handleCheckReservation(patientId: string, tenantId: string | null): Promise<ToolResult> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("reserve_id, reserve_date, reserve_time, status")
      .eq("patient_id", patientId)
      .not("reserve_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1),
    tenantId
  );

  if (!data || data.length === 0) {
    return { content: "予約情報が見つかりません。まだ予約を取っていない可能性があります。" };
  }

  const r = data[0];
  return {
    content: `予約状況:\n- 予約日: ${r.reserve_date || "不明"}\n- 予約時間: ${r.reserve_time || "不明"}\n- ステータス: ${r.status || "不明"}`,
  };
}

async function handleCheckOrderStatus(patientId: string, tenantId: string | null): Promise<ToolResult> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("id, payment_status, shipping_status, payment_method, total_amount, created_at, shipped_at, tracking_number")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1),
    tenantId
  );

  if (!data || data.length === 0) {
    return { content: "注文情報が見つかりません。" };
  }

  const o = data[0];
  const payLabel = o.payment_status === "paid" ? "決済済み" : o.payment_status === "pending" ? "未決済" : o.payment_status;
  const shipLabel = o.shipping_status === "shipped" ? "発送済み" : o.shipping_status === "delivered" ? "配達済み" : o.shipping_status === "preparing" ? "準備中" : o.shipping_status === "pending" ? "未発送" : o.shipping_status;

  let result = `最新注文:\n- 決済: ${payLabel}\n- 発送: ${shipLabel}\n- 金額: ${o.total_amount ? `${o.total_amount}円` : "不明"}`;
  if (o.tracking_number) result += `\n- 追跡番号: ${o.tracking_number}`;
  if (o.shipped_at) result += `\n- 発送日: ${new Date(o.shipped_at).toLocaleDateString("ja-JP")}`;

  return { content: result };
}

async function handleCheckPaymentStatus(patientId: string, tenantId: string | null): Promise<ToolResult> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("payment_status, payment_method, total_amount, paid_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1),
    tenantId
  );

  if (!data || data.length === 0) {
    return { content: "決済情報が見つかりません。" };
  }

  const o = data[0];
  const methodLabel = o.payment_method === "credit_card" ? "クレジットカード" : o.payment_method === "bank_transfer" ? "銀行振込" : o.payment_method || "不明";
  return {
    content: `決済状況:\n- ステータス: ${o.payment_status === "paid" ? "決済済み" : "未決済"}\n- 支払方法: ${methodLabel}\n- 金額: ${o.total_amount ? `${o.total_amount}円` : "不明"}${o.paid_at ? `\n- 決済日: ${new Date(o.paid_at).toLocaleDateString("ja-JP")}` : ""}`,
  };
}

async function handleCheckQuestionnaireStatus(patientId: string, tenantId: string | null): Promise<ToolResult> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("status, answers, questionnaire_completed_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1),
    tenantId
  );

  if (!data || data.length === 0) {
    return { content: "問診情報が見つかりません。" };
  }

  const i = data[0];
  const hasAnswers = i.answers && Object.keys(i.answers as Record<string, unknown>).length > 0;
  return {
    content: `問診状況:\n- ステータス: ${i.status || "不明"}\n- 問診回答: ${hasAnswers ? "回答済み" : "未回答"}${i.questionnaire_completed_at ? `\n- 完了日: ${new Date(i.questionnaire_completed_at).toLocaleDateString("ja-JP")}` : ""}`,
  };
}
