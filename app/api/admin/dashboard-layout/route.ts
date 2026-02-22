// app/api/admin/dashboard-layout/route.ts — ダッシュボードウィジェット配置 API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting } from "@/lib/settings";
import { resolveTenantId } from "@/lib/tenant";

// ウィジェットID一覧（デフォルト順）
export const WIDGET_DEFINITIONS = [
  { id: "reservations", label: "予約件数", group: "kpi_main" },
  { id: "shipping", label: "配送件数", group: "kpi_main" },
  { id: "revenue", label: "売上", group: "kpi_main" },
  { id: "repeat_rate", label: "リピート率", group: "kpi_main" },
  { id: "payment_rate", label: "診療後の決済率", group: "kpi_conversion" },
  { id: "reservation_rate", label: "問診後の予約率", group: "kpi_conversion" },
  { id: "consultation_rate", label: "予約後の受診率", group: "kpi_conversion" },
  { id: "line_registered", label: "LINE登録者数", group: "kpi_today" },
  { id: "active_reservations", label: "アクティブ予約数", group: "kpi_today" },
  { id: "today_paid", label: "本日の決済人数", group: "kpi_today" },
  { id: "avg_order", label: "顧客単価", group: "kpi_today" },
  { id: "daily_chart", label: "新規処方 vs 再処方グラフ", group: "chart" },
  { id: "product_sales", label: "商品別売上", group: "detail" },
  { id: "bank_transfer", label: "銀行振込状況", group: "detail" },
] as const;

export type WidgetId = (typeof WIDGET_DEFINITIONS)[number]["id"];

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
}

/** デフォルトレイアウト（全ウィジェット表示） */
export function getDefaultLayout(): DashboardLayout {
  return {
    widgets: WIDGET_DEFINITIONS.map((w) => ({ id: w.id, visible: true })),
  };
}

// GET: レイアウト取得
export async function GET(request: NextRequest) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(request) || undefined;

  const raw = await getSetting("dashboard", "layout", tenantId);
  if (!raw) {
    return NextResponse.json(getDefaultLayout());
  }

  try {
    const layout: DashboardLayout = JSON.parse(raw);
    // 新しく追加されたウィジェットがあれば末尾に追加
    const knownIds = new Set(layout.widgets.map((w) => w.id));
    for (const def of WIDGET_DEFINITIONS) {
      if (!knownIds.has(def.id)) {
        layout.widgets.push({ id: def.id, visible: true });
      }
    }
    // 削除されたウィジェットIDを除外
    const validIds = new Set(WIDGET_DEFINITIONS.map((d) => d.id));
    layout.widgets = layout.widgets.filter((w) => validIds.has(w.id));
    return NextResponse.json(layout);
  } catch {
    return NextResponse.json(getDefaultLayout());
  }
}

// PUT: レイアウト保存
export async function PUT(request: NextRequest) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(request) || undefined;

  let body: DashboardLayout;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  // バリデーション
  if (!body.widgets || !Array.isArray(body.widgets)) {
    return NextResponse.json({ error: "widgets配列が必要です" }, { status: 400 });
  }

  const validIds = new Set(WIDGET_DEFINITIONS.map((d) => d.id));
  const seenIds = new Set<string>();
  for (const w of body.widgets) {
    if (!validIds.has(w.id)) {
      return NextResponse.json({ error: `不正なウィジェットID: ${w.id}` }, { status: 400 });
    }
    if (seenIds.has(w.id)) {
      return NextResponse.json({ error: `重複ウィジェットID: ${w.id}` }, { status: 400 });
    }
    seenIds.add(w.id);
    if (typeof w.visible !== "boolean") {
      return NextResponse.json({ error: `visible はboolean必須: ${w.id}` }, { status: 400 });
    }
  }

  const ok = await setSetting("dashboard", "layout", JSON.stringify(body), tenantId);
  if (!ok) {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
