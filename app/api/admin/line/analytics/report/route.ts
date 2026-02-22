// app/api/admin/line/analytics/report/route.ts — 配信分析レポートPDF生成
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ページネーション付きfetch
async function fetchAll(buildQuery: () => any, pageSize = 5000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const period = Number(req.nextUrl.searchParams.get("period")) || 30;
  const validPeriod = [7, 30, 90].includes(period) ? period : 30;

  // 期間計算
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - validPeriod);
  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodEndStr = now.toISOString().slice(0, 10);

  // 配信データ取得（analytics/route.ts と同じロジック）
  const { data: broadcastRows } = await withTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("id, name, status, total_targets, sent_count, failed_count, no_uid_count, sent_at, created_at")
      .in("status", ["sent", "sending"])
      .order("created_at", { ascending: false })
      .limit(50),
    tenantId
  );

  // クリック数取得
  const broadcastIds = (broadcastRows || []).map((b: any) => b.id);
  const broadcastClickMap = new Map<number, { total: number; unique: number }>();

  if (broadcastIds.length > 0) {
    const { data: clickLinks } = await withTenant(
      supabaseAdmin
        .from("click_tracking_links")
        .select("id, broadcast_id")
        .in("broadcast_id", broadcastIds),
      tenantId
    );

    if (clickLinks && clickLinks.length > 0) {
      const linkIds = clickLinks.map((l: any) => l.id);
      const linkToBroadcast = new Map<number, number>();
      for (const l of clickLinks) linkToBroadcast.set(l.id, l.broadcast_id);

      const { data: clickEvts } = await fetchAll(() =>
        withTenant(
          supabaseAdmin
            .from("click_tracking_events")
            .select("link_id, ip_address")
            .in("link_id", linkIds),
          tenantId
        )
      );

      for (const evt of clickEvts || []) {
        const bid = linkToBroadcast.get(evt.link_id);
        if (bid == null) continue;
        const cur = broadcastClickMap.get(bid) || { total: 0, unique: 0 };
        cur.total++;
        broadcastClickMap.set(bid, cur);
      }

      const uniqueByBroadcast = new Map<number, Set<string>>();
      for (const evt of clickEvts || []) {
        const bid = linkToBroadcast.get(evt.link_id);
        if (bid == null) continue;
        if (!uniqueByBroadcast.has(bid)) uniqueByBroadcast.set(bid, new Set());
        uniqueByBroadcast.get(bid)!.add(evt.ip_address || "unknown");
      }
      for (const [bid, ips] of uniqueByBroadcast) {
        const cur = broadcastClickMap.get(bid) || { total: 0, unique: 0 };
        cur.unique = ips.size;
        broadcastClickMap.set(bid, cur);
      }
    }
  }

  // CVR算出
  const broadcastCvrMap = new Map<number, { orders: number; cvr: number }>();
  for (const b of broadcastRows || []) {
    const sentDate = b.sent_at || b.created_at;
    if (!sentDate) continue;
    const sentStart = new Date(sentDate);
    const sentEnd = new Date(sentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { count: orderCount } = await withTenant(
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("paid_at", sentStart.toISOString())
        .lte("paid_at", sentEnd.toISOString()),
      tenantId
    );
    const clicks = broadcastClickMap.get(b.id);
    const uniqueClicks = clicks?.unique || 0;
    const orders = orderCount || 0;
    const cvr = uniqueClicks > 0 ? Number(((orders / uniqueClicks) * 100).toFixed(1)) : 0;
    broadcastCvrMap.set(b.id, { orders, cvr });
  }

  // 配信統計構築
  const broadcastStats = (broadcastRows || []).map((b: any) => {
    const clicks = broadcastClickMap.get(b.id) || { total: 0, unique: 0 };
    const cvrData = broadcastCvrMap.get(b.id) || { orders: 0, cvr: 0 };
    const deliveryRate = b.total_targets > 0
      ? Number(((b.sent_count / b.total_targets) * 100).toFixed(1))
      : 0;
    const clickRate = b.sent_count > 0
      ? Number(((clicks.unique / b.sent_count) * 100).toFixed(1))
      : 0;
    return {
      name: b.name || "Untitled",
      sentAt: b.sent_at || b.created_at,
      totalTargets: b.total_targets,
      sentCount: b.sent_count,
      failedCount: b.failed_count,
      deliveryRate,
      uniqueClicks: clicks.unique,
      clickRate,
      orders: cvrData.orders,
      cvr: cvrData.cvr,
    };
  });

  // KPI算出
  const totalBroadcasts = broadcastStats.length;
  const avgDeliveryRate = totalBroadcasts > 0
    ? Number((broadcastStats.reduce((sum, b) => sum + b.deliveryRate, 0) / totalBroadcasts).toFixed(1))
    : 0;
  const avgClickRate = totalBroadcasts > 0
    ? Number((broadcastStats.reduce((sum, b) => sum + b.clickRate, 0) / totalBroadcasts).toFixed(1))
    : 0;
  const cvrBroadcasts = broadcastStats.filter(b => b.uniqueClicks > 0);
  const avgCvr = cvrBroadcasts.length > 0
    ? Number((cvrBroadcasts.reduce((sum, b) => sum + b.cvr, 0) / cvrBroadcasts.length).toFixed(1))
    : 0;

  // --- PDF生成 ---
  const doc = new jsPDF();

  // タイトル
  doc.setFontSize(20);
  doc.text("LINE Broadcast Analytics Report", 105, 20, { align: "center" });

  // 期間
  doc.setFontSize(10);
  doc.text(`Period: ${validPeriod} days (${periodStartStr} - ${periodEndStr})`, 105, 30, { align: "center" });
  doc.text(`Generated: ${now.toISOString().slice(0, 10)}`, 105, 36, { align: "center" });

  // KPIサマリ
  doc.setFontSize(14);
  doc.text("Summary", 15, 50);

  doc.setFontSize(10);
  const kpiY = 58;
  const kpiData = [
    ["Total Broadcasts", String(totalBroadcasts)],
    ["Avg Delivery Rate", `${avgDeliveryRate}%`],
    ["Avg CTR", `${avgClickRate}%`],
    ["Avg CVR", `${avgCvr}%`],
  ];

  autoTable(doc, {
    startY: kpiY,
    head: [["Metric", "Value"]],
    body: kpiData,
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 10 },
    tableWidth: 100,
    margin: { left: 15 },
  });

  // 配信別統計テーブル
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableStartY = (doc as any).lastAutoTable?.finalY + 15 || 100;

  doc.setFontSize(14);
  doc.text("Broadcast Performance", 15, tableStartY);

  const fmtDate = (s: string) => {
    try {
      const d = new Date(s);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return s;
    }
  };

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [["Name", "Date", "Targets", "Sent", "Del%", "Clicks", "CTR%", "Orders", "CVR%"]],
    body: broadcastStats.map(b => [
      b.name.length > 20 ? b.name.slice(0, 20) + "..." : b.name,
      fmtDate(b.sentAt),
      String(b.totalTargets),
      String(b.sentCount),
      `${b.deliveryRate}`,
      String(b.uniqueClicks),
      `${b.clickRate}`,
      String(b.orders),
      `${b.cvr}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
    },
  });

  // フッター
  doc.setFontSize(8);
  doc.text("Generated by L-ope for CLINIC", 105, 285, { align: "center" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="line-analytics-${periodStartStr}-${periodEndStr}.pdf"`,
    },
  });
}
